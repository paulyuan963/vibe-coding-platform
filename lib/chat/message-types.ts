export type ParsedBlock = {
  title: string;
  content: string;
};

export type StrategyCardData = {
  title: string;
  confidence?: string;
  positionIdea?: string;
  entries: string[];
  takeProfits: string[];
  stopLoss?: string;
  logic?: string;
};

export type GenericPart = {
  type?: string;
  text?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  error?: unknown;
  result?: unknown;
  callId?: string;
};