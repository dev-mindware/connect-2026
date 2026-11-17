export function buildOpenApiSpec(port: number): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Connect 2026 API',
      version: '1.0.0',
      description:
        'API de inscrições, controlo de lotação (MAX_REGISTRATIONS), geração de convites digitais com QR Code assinado e check-in para o evento Connect 2026.',
      contact: {
        name: 'Organização A.M.T.T.S — Connect 2026',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Servidor actual',
      },
      {
        url: `http://127.0.0.1:${port}`,
        description: 'Desenvolvimento local',
      },
    ],
    tags: [
      {
        name: 'Sistema',
        description: 'Healthcheck e disponibilidade de vagas',
      },
      {
        name: 'Inscrições',
        description: 'Registo de participantes e envio de convites com QR Code',
      },
      {
        name: 'Check-in',
        description: 'Validação presencial dos convites na entrada do evento',
      },
    ],
    components: {
      securitySchemes: {
        AdminApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-api-key',
          description:
            'Chave administrativa configurada em ADMIN_API_KEY para validar check-in na entrada.',
        },
      },
      schemas: {
        EventStatus: {
          type: 'object',
          properties: {
            maxRegistrations: { type: 'integer', example: 200 },
            registeredCount: { type: 'integer', example: 42 },
            remainingSpots: { type: 'integer', example: 158 },
            isFull: { type: 'boolean', example: false },
            registrationOpen: { type: 'boolean', example: true },
          },
        },
        CreateRegistrationRequest: {
          type: 'object',
          required: ['fullName', 'email', 'whatsapp'],
          properties: {
            fullName: {
              type: 'string',
              minLength: 3,
              maxLength: 120,
              example: 'Ana Paula Manuel',
            },
            address: {
              type: 'string',
              maxLength: 200,
              nullable: true,
              example: 'Viana, Luanda',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'ana.manuel@exemplo.com',
            },
            whatsapp: {
              type: 'string',
              description:
                'Número angolano (9 dígitos) ou internacional em formato E.164.',
              example: '+244 934 242 419',
            },
          },
        },
        RegistrationTicket: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm3abc123def' },
            fullName: { type: 'string', example: 'Ana Paula Manuel' },
            address: {
              type: 'string',
              nullable: true,
              example: 'Viana, Luanda',
            },
            email: { type: 'string', example: 'ana.manuel@exemplo.com' },
            whatsapp: { type: 'string', example: '+244934242419' },
            ticketCode: { type: 'string', example: 'C26-7K9P2M' },
            qrToken: {
              type: 'string',
              example: 'C26-7K9P2M.8a1f3b4c5d6e7f8a9b0c1d2e',
            },
            qrUrl: {
              type: 'string',
              example:
                'https://connect2026.vercel.app/convite?token=C26-7K9P2M.8a1f3b4c5d6e7f8a9b0c1d2e',
            },
            qrCodeDataUrl: {
              type: 'string',
              example: 'data:image/png;base64,iVBORw0KGgo...',
            },
            emailStatus: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'SKIPPED', 'FAILED'],
              example: 'SENT',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-11-18T10:15:30.000Z',
            },
          },
        },
        CheckinRequest: {
          type: 'object',
          required: ['qrToken'],
          properties: {
            qrToken: {
              type: 'string',
              example: 'C26-7K9P2M.8a1f3b4c5d6e7f8a9b0c1d2e',
            },
            qrUrl: {
              type: 'string',
              example:
                'https://connect2026.vercel.app/convite?token=C26-7K9P2M.8a1f3b4c5d6e7f8a9b0c1d2e',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'VALIDATION_ERROR' },
            message: {
              type: 'string',
              example: 'Indique um endereço de e-mail válido.',
            },
          },
        },
      },
    },
    paths: {
      '/': {
        get: {
          tags: ['Sistema'],
          summary: 'Estado básico do serviço',
          description: 'Endpoint utilizado pelo Docker HEALTHCHECK.',
          responses: {
            '200': {
              description: 'API operacional',
            },
          },
        },
      },
      '/api/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Saúde da API e base de dados',
          description:
            'Verifica a conectividade com o PostgreSQL antes de responder.',
          responses: {
            '200': { description: 'Ligação ao PostgreSQL saudável' },
            '503': { description: 'Base de dados indisponível' },
          },
        },
      },
      '/api/status': {
        get: {
          tags: ['Sistema'],
          summary: 'Consultar vagas disponíveis',
          description:
            'Devolve o total de inscritos, vagas restantes e estado de lotação face a MAX_REGISTRATIONS.',
          responses: {
            '200': {
              description: 'Estado actual das inscrições',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/EventStatus' },
                },
              },
            },
          },
        },
      },
      '/api/registrations': {
        post: {
          tags: ['Inscrições'],
          summary: 'Criar nova inscrição e enviar convite',
          description:
            'Valida os dados, verifica unicidade e limite MAX_REGISTRATIONS em transacção, gera QR Code assinado e envia o convite por e-mail.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateRegistrationRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Inscrição confirmada e convite gerado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Inscrição confirmada com sucesso.',
                      },
                      registration: {
                        $ref: '#/components/schemas/RegistrationTicket',
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Dados inválidos',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '409': {
              description:
                'Lotação esgotada (CAPACITY_REACHED) ou e-mail/WhatsApp duplicado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
            '429': {
              description: 'Limite de pedidos atingido (Rate Limiting)',
            },
          },
        },
      },
      '/api/registrations/{ticketCode}/resend': {
        post: {
          tags: ['Inscrições'],
          summary: 'Reenviar convite por e-mail',
          parameters: [
            {
              name: 'ticketCode',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'C26-7K9P2M' },
            },
          ],
          responses: {
            '200': { description: 'Pedido de reenvio processado' },
            '404': { description: 'Inscrição não encontrada' },
            '429': { description: 'Limite de reenvios atingido' },
          },
        },
      },
      '/api/tickets/verify': {
        get: {
          tags: ['Inscrições'],
          summary: 'Consultar dados do inscrito a partir do token do QR Code',
          description:
            'Valida a assinatura HMAC do token presente no URL do QR Code e devolve os dados do participante.',
          parameters: [
            {
              name: 'token',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                example: 'C26-7K9P2M.8a1f3b4c5d6e7f8a9b0c1d2e',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Dados do inscrito validados',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      registration: {
                        $ref: '#/components/schemas/RegistrationTicket',
                      },
                    },
                  },
                },
              },
            },
            '400': { description: 'Token inválido ou em falta' },
            '404': { description: 'Inscrição não encontrada' },
          },
        },
      },
      '/api/checkin': {
        post: {
          tags: ['Check-in'],
          summary: 'Validar convite na entrada do evento',
          description:
            'Verifica a assinatura HMAC do QR Code e marca a entrada do participante, impedindo reutilização.',
          security: [{ AdminApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CheckinRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Check-in validado com sucesso' },
            '400': { description: 'QR Code inválido ou adulterado' },
            '401': { description: 'Chave x-admin-api-key em falta ou inválida' },
            '404': { description: 'Convite não encontrado' },
            '409': { description: 'Convite já utilizado anteriormente' },
          },
        },
      },
    },
  };
}
