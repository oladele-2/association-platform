export interface DomainEvent<TPayload = Record<string, unknown>> {
  readonly eventId: string;
  readonly eventType: string;
  readonly organizationId: string | null;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export function createDomainEvent<TPayload extends Record<string, unknown>>(input: {
  eventId: string;
  eventType: string;
  organizationId: string | null;
  aggregateType: string;
  aggregateId: string;
  occurredAt?: Date;
  payload: TPayload;
}): DomainEvent<TPayload> {
  return {
    eventId: input.eventId,
    eventType: input.eventType,
    organizationId: input.organizationId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    occurredAt: input.occurredAt ?? new Date(),
    payload: input.payload,
  };
}
