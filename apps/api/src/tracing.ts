// Tracing com OpenTelemetry. Este arquivo entra antes da API (node --import, no Dockerfile) porque a
// instrumentação só alcança os módulos carregados depois dela. Sem endpoint configurado, não carrega
// nada. A função da Vercel não importa este arquivo: lá o tracing não existe.
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const [{ NodeSDK }, { OTLPTraceExporter }, { HttpInstrumentation }, { PgInstrumentation }] =
    await Promise.all([
      import("@opentelemetry/sdk-node"),
      import("@opentelemetry/exporter-trace-otlp-http"),
      import("@opentelemetry/instrumentation-http"),
      import("@opentelemetry/instrumentation-pg"),
    ]);

  // Healthcheck e coleta de métricas rodam o tempo todo e só encheriam a lista de traces de ruído.
  const NOT_TRACED = new Set(["/health", "/metrics"]);

  new NodeSDK({
    serviceName: "devland-api",
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request) => NOT_TRACED.has(request.url ?? ""),
      }),
      new PgInstrumentation(),
    ],
  }).start();
}
