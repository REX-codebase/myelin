import * as z from "zod";

enum Role {
  Admin = "admin",
  Member = "member",
}

const BaseSchema = z.object({ id: z.string(), createdAt: z.date() });
const ProfileSchema = z.object({ displayName: z.string(), role: z.enum(Role) });

export const AccountSchema = BaseSchema.extend(ProfileSchema.shape);
export const AccountPatchSchema = AccountSchema.partial();
export const ADMIN = AccountSchema.shape.role.enum.Admin;
