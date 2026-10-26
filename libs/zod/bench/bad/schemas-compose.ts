import { z } from "zod";

enum Role {
  Admin = "admin",
  Member = "member",
}

const BaseSchema = z.object({ id: z.string(), createdAt: z.date() });
const ProfileSchema = z.object({ displayName: z.string(), role: z.nativeEnum(Role) });

export const AccountSchema = BaseSchema.merge(ProfileSchema);
export const AccountPatchSchema = AccountSchema.deepPartial();
