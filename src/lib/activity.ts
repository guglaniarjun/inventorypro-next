import prisma from "./prisma";
import { SessionUser } from "./session";

interface LogActivityParams {
  user: SessionUser;
  actionType: string;
  module: string;
  recordId?: number;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        tenantId: params.user.tenantId,
        userId: params.user.id,
        userName: params.user.fullName,
        actionType: params.actionType,
        module: params.module,
        recordId: params.recordId ?? null,
        description: params.description,
        oldValue: params.oldValue ? (params.oldValue as object) : undefined,
        newValue: params.newValue ? (params.newValue as object) : undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch {
    // Non-critical — don't throw
  }
}
