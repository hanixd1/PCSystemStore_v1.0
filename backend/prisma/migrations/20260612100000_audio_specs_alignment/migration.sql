ALTER TABLE "HeadsetSpecs"
ADD COLUMN "audioType" TEXT,
ADD COLUMN "micIntegrated" BOOLEAN,
ADD COLUMN "micRemovable" BOOLEAN,
ADD COLUMN "surroundSound" TEXT,
ADD COLUMN "consoleCompatible" BOOLEAN,
ADD COLUMN "color" TEXT;

ALTER TABLE "MicrophoneSpecs"
ADD COLUMN "microphoneType" TEXT,
ADD COLUMN "connectionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "frequencyResponse" TEXT,
ADD COLUMN "includesArm" BOOLEAN,
ADD COLUMN "includesPopFilter" BOOLEAN,
ADD COLUMN "color" TEXT;

ALTER TABLE "SpeakerSpecs"
ADD COLUMN "speakerType" TEXT,
ADD COLUMN "channels" TEXT,
ADD COLUMN "connectionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "hasSubwoofer" BOOLEAN,
ADD COLUMN "remoteControl" BOOLEAN,
ADD COLUMN "color" TEXT;
