import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import type { DomainErrorKind } from '../../domain/DomainError';
import { DomainErrorException } from './BaseController';

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  validation: 400,
  not_found: 404,
  invalid_state: 409,
  unavailable: 503,
};

// Único lugar donde un error se convierte en respuesta HTTP.
export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply): void => {
  if (error instanceof DomainErrorException) {
    const statusCode = STATUS_BY_KIND[error.domainError.kind];
    void reply.status(statusCode).send({ error: error.domainError.kind, message: error.message });
    return;
  }

  // Errores 4xx de Fastify o sus plugins (archivo muy grande, no es multipart, JSON inválido...).
  if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
    void reply.status(error.statusCode).send({ error: error.code ?? 'bad_request', message: error.message });
    return;
  }

  // Inesperado: se registra completo pero al cliente no se le filtran detalles internos.
  request.log.error({ err: error }, 'Error no controlado');
  void reply.status(500).send({ error: 'internal_error', message: 'Error interno del servidor' });
};
