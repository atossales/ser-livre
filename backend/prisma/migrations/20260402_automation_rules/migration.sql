-- Add weighDay to Patient
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "weighDay" INTEGER;

-- Create AutomationRule table
CREATE TABLE IF NOT EXISTS "AutomationRule" (
    "id" SERIAL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "messageBody" TEXT,
    "templateId" INTEGER,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL
);

-- Add automationRuleId to MessageLog
ALTER TABLE "MessageLog" ADD COLUMN IF NOT EXISTS "automationRuleId" INTEGER;
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_automationRuleId_fkey"
    FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL;

-- Seed default automation rules
INSERT INTO "AutomationRule" ("type", "name", "enabled", "config", "messageBody", "gracePeriodDays", "updatedAt") VALUES
('WELCOME', 'Boas-vindas', true, '{}',
 'Ola {{nome}}! Seja bem-vinda ao Programa Ser Livre do Instituto Dra. Mariana Wogel. Estamos juntas nessa jornada! Qualquer duvida, fale conosco.', 0, CURRENT_TIMESTAMP),
('APPOINTMENT_REMINDER', 'Lembrete de consulta', true, '{"hoursBefore": 24}',
 'Ola {{nome}}! Lembrete: voce tem {{tipo_consulta}} amanha as {{hora_consulta}} no Instituto Dra. Mariana Wogel. Ate la!', 0, CURRENT_TIMESTAMP),
('WEEKLY_MOTIVATIONAL', 'Motivacional semanal', true, '{"dayOfWeek": 1, "hour": 8, "minute": 10}',
 'Ola {{nome}}, Semana {{semana}} do programa iniciada! Mantenha o protocolo alimentar e lembre-se: cada passo conta. Instituto Dra. Mariana Wogel', 3, CURRENT_TIMESTAMP),
('WEIGH_REMINDER', 'Lembrete de pesagem', true, '{"hour": 9, "minute": 0, "fallbackDay": 4}',
 'Ola {{nome}}, nao esqueca de registrar seu peso esta semana! A pesagem regular e fundamental para acompanharmos sua evolucao. Equipe Ser Livre.', 7, CURRENT_TIMESTAMP),
('INACTIVITY_ALERT', 'Alerta de inatividade', true, '{"inactiveDays": 14, "cooldownDays": 7, "hour": 10}',
 'Ola {{nome}}, sentimos sua falta! Nossa equipe esta aqui para te apoiar. Entre em contato para agendar seu retorno. Instituto Dra. Mariana Wogel', 14, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
