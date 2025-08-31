import { SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';

/**
 * Custom decorator to assign the required roles to an endpoint.
 *
 * @param roles - A list of the RoleName that are allowed
 **/

export const Roles = (...roles: RoleName[]) => SetMetadata('roles', roles);
