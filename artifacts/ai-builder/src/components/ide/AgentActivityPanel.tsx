import type { AgentInfo, SwarmProgress } from '@/hooks/use-chat-stream';

const AGENT_ICONS: Record<string, string> = {
  coordinator: '🧠',
  coder: '💻',
  reviewer: '🔍',
  designer: '🎨',
};

const STATUS_COLORS: Record<string, string> = {
  spawned: 'text-yellow-400',
  running: 'text-blue-400',
  completed: 'text-emerald-400',
};

interface Props {
  agents: AgentInfo[];
  progress: SwarmProgress | null;
}

export function AgentActivityPanel({ agents, progress }: Props) {
  if (!agents.length && !progress) return null;

  const completedCount = agents.filter((a) => a.status === 'completed').length;
  const totalCount = progress?.totalTasks ?? agents.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mx-3 mb-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-emerald-400">
          Multi-Agent Swarm {progress?.phase === 'complete' ? '(Complete)' : ''}
        </span>
        <span className="text-xs text-slate-400">
          {progress?.completedTasks ?? completedCount}/{progress?.totalTasks ?? totalCount} tasks
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Agent list */}
      <div className="space-y-1">
        {agents.map((agent) => (
          <div key={agent.agentId} className="flex items-center gap-2 text-xs">
            <span>{AGENT_ICONS[agent.agentType] || '⚙️'}</span>
            <span className="font-medium text-slate-300 capitalize">{agent.agentType}</span>
            <span className={STATUS_COLORS[agent.status] || 'text-slate-400'}>
              {agent.status === 'running' ? agent.message || 'working...' : agent.status}
            </span>
            {agent.filesChanged && agent.filesChanged.length > 0 && (
              <span className="text-slate-500">
                ({agent.filesChanged.length} file{agent.filesChanged.length > 1 ? 's' : ''})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
