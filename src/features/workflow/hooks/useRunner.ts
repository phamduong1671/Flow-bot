import { useState } from 'react';
import { apiRequest } from '../../auth/api';
import { useAuth } from '../../auth/AuthContext';
import { createRunnerMessage, executeFlowUntilPause, pickNextEdge } from '../utils/runner';

const emptyContext = { variables: {}, actions: [] };

export function useRunner(nodes, edges, { flowId, beforeRemoteRun }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [input, setInput] = useState('');
  const [context, setContext] = useState(emptyContext);
  const [waitingNodeId, setWaitingNodeId] = useState(null);
  const [monitoringOpen, setMonitoringOpen] = useState(false);
  const [trace, setTrace] = useState(null);

  function applyResult(result, leadingMessages = []) {
    const resultMessages = [...leadingMessages, ...result.messages];
    setContext(result.context);

    if (result.status === 'waiting') {
      setMessages((current) => [...current, ...resultMessages]);
      setWaitingNodeId(result.waitingNodeId);
      setStatus('waiting');
      return;
    }

    setMessages((current) => [
      ...current,
      ...resultMessages,
      createRunnerMessage(result.status === 'error' ? 'error' : 'system', result.text),
    ]);
    setWaitingNodeId(null);
    setStatus(result.status);
  }

  function runFromNode(startNodeId, nextContext, leadingMessages = []) {
    setStatus('running');
    applyResult(
      executeFlowUntilPause({ startNodeId, nodes, edges, context: nextContext }),
      leadingMessages,
    );
  }

  function start() {
    const needsBackend = nodes.some((node) =>
      ['input', 'rag_search', 'web_search', 'llm', 'output'].includes(node.type),
    );
    if (token && flowId) {
      setOpen(true);
      setMonitoringOpen(false);
      setTrace(null);
      setInput('');
      setContext(emptyContext);
      setWaitingNodeId('__remote_workflow__');
      setStatus('waiting');
      setMessages([createRunnerMessage('system', 'Enter the workflow input, then press Send.')]);
      return;
    }
    if (needsBackend) {
      setOpen(true);
      setStatus('error');
      setMessages([
        createRunnerMessage(
          'error',
          'Sign in to run LLM and search nodes securely on the backend.',
        ),
      ]);
      return;
    }
    const startNode = nodes.find((node) => node.type === 'start');
    setOpen(true);
    setInput('');
    setWaitingNodeId(null);

    if (!startNode) {
      setStatus('error');
      setMessages([createRunnerMessage('error', 'Flow needs one Start node before it can run.')]);
      return;
    }

    setContext(emptyContext);
    setMessages([]);
    runFromNode(startNode.id, emptyContext);
  }

  function close() {
    setOpen(false);
    setMonitoringOpen(false);
    setMessages([]);
    setStatus('idle');
    setInput('');
    setContext(emptyContext);
    setWaitingNodeId(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (status !== 'waiting' || !waitingNodeId) return;

    const answer = input.trim();
    if (!answer) return;

    if (waitingNodeId === '__remote_workflow__' && token && flowId) {
      const startedAt = new Date().toISOString();
      setInput('');
      setWaitingNodeId(null);
      setStatus('running');
      setMessages((current) => [...current, createRunnerMessage('user', answer)]);
      setTrace({ status: 'running', input: answer, startedAt, steps: [] });
      try {
        await beforeRemoteRun();
        const { run } = await apiRequest(
          `/api/flows/${flowId}/runs`,
          {
            method: 'POST',
            body: JSON.stringify({ input: answer }),
          },
          token,
        );
        const nodeLabels = Object.fromEntries(nodes.map((node) => [node.id, node.label]));
        setTrace({
          ...run,
          input: answer,
          steps: run.steps.map((step) => ({ ...step, label: nodeLabels[step.nodeId] })),
        });
        setMessages((current) => [
          ...current,
          createRunnerMessage(
            'bot',
            typeof run.output === 'string' ? run.output : JSON.stringify(run.output),
          ),
        ]);
        setStatus('ended');
      } catch (reason) {
        const details = reason instanceof Error && 'details' in reason ? reason.details : {};
        setTrace({
          status: 'error',
          input: answer,
          startedAt,
          endedAt: new Date().toISOString(),
          steps: [],
          error: {
            message: reason instanceof Error ? reason.message : 'Workflow run failed.',
            ...(details && typeof details === 'object' ? details : {}),
          },
        });
        setStatus('error');
      }
      return;
    }

    const questionNode = nodes.find((node) => node.id === waitingNodeId);
    if (!questionNode) {
      setMessages((current) => [
        ...current,
        createRunnerMessage('error', 'Waiting question node was removed.'),
      ]);
      setStatus('error');
      return;
    }

    const variable = questionNode.data.variable || questionNode.id;
    const nextContext = {
      ...context,
      variables: { ...context.variables, [variable]: answer },
    };
    const nextEdge = pickNextEdge(edges.filter((edge) => edge.source === questionNode.id));

    setInput('');
    setWaitingNodeId(null);
    runFromNode(nextEdge?.target, nextContext, [createRunnerMessage('user', answer)]);
  }

  return {
    runner: { open, messages, status, input, trace, monitoringOpen },
    setInput,
    start,
    close,
    submit,
    openMonitoring: () => setMonitoringOpen(true),
    closeMonitoring: () => setMonitoringOpen(false),
  };
}
