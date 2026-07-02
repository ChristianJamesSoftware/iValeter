-- AlterTable User: assign dealership users to their department
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

-- AddForeignKey User → Department
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'User_departmentId_fkey'
    ) THEN
        ALTER TABLE "User"
            ADD CONSTRAINT "User_departmentId_fkey"
            FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_departmentId_idx" ON "User"("departmentId");
