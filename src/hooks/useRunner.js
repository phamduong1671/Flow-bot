import { useState } from 'react';
import { createRunnerMessage, executeFlowUntilPause, pickNextEdge } from '../utils/runner';

const emptyContext = { variables: {}, actions: [] };

export function useRunner(nodes, edges) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [input, setInput] = useState('');
  const [context, setContext] = useState(emptyContext);
  const [waitingNodeId, setWaitingNodeId] = useState(null);

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
    setMessages([]);
    setStatus('idle');
    setInput('');
    setContext(emptyContext);
    setWaitingNodeId(null);
  }

  function submit(event) {
    event.preventDefault();
    if (status !== 'waiting' || !waitingNodeId) return;

    const answer = input.trim();
    if (!answer) return;

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
    runner: { open, messages, status, input },
    setInput,
    start,
    close,
    submit,
  };
}
