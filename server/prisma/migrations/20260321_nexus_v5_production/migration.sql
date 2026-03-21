-- Nexus HRM v5 Production Migration
-- Adds leaveType to LeaveRequest and sets up EmployeeReporting properly

-- Add leaveType to LeaveRequest (safe: uses DEFAULT so existing rows get 'Annual')
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LeaveRequest' AND column_name = 'leaveType'
  ) THEN
    ALTER TABLE "LeaveRequest" ADD COLUMN "leaveType" TEXT NOT NULL DEFAULT 'Annual';
  END IF;
END $$;

-- Ensure EmployeeReporting has correct indexes
CREATE INDEX IF NOT EXISTS "EmployeeReporting_organizationId_employeeId_idx" 
  ON "EmployeeReporting"("organizationId", "employeeId");
  
CREATE INDEX IF NOT EXISTS "EmployeeReporting_organizationId_managerId_idx" 
  ON "EmployeeReporting"("organizationId", "managerId");
