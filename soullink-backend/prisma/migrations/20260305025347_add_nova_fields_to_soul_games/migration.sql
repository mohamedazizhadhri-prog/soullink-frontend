-- AlterTable
ALTER TABLE "GameChoice" ADD COLUMN     "reflectionPrompt" TEXT;

-- AlterTable
ALTER TABLE "GameScene" ADD COLUMN     "novaComment" TEXT,
ADD COLUMN     "novaMood" TEXT;

-- AlterTable
ALTER TABLE "SoulGame" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'personality';
