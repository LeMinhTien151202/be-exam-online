import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, SystemMenu } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

type MenuNode = SystemMenu & { children: MenuNode[] };

@Injectable()
export class MenusService {
  constructor(private prisma: PrismaService) {}

  // Dựng cây menu theo parentId, sắp xếp theo sortOrder.
  private buildTree(menus: SystemMenu[]): MenuNode[] {
    const map = new Map<number, MenuNode>();
    menus.forEach((m) => map.set(m.id, { ...m, children: [] }));

    const roots: MenuNode[] = [];
    menus.forEach((m) => {
      const node = map.get(m.id)!;
      if (m.parentId != null && map.has(m.parentId)) {
        map.get(m.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sort = (nodes: MenuNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((n) => sort(n.children));
    };
    sort(roots);
    return roots;
  }

  // Sidebar theo role user hiện tại.
  async getMenusForRole(role: Role): Promise<MenuNode[]> {
    const access = await this.prisma.roleMenuAccess.findMany({
      where: { role },
      select: { menuId: true },
    });
    const ids = access.map((a) => a.menuId);
    if (ids.length === 0) return [];
    const menus = await this.prisma.systemMenu.findMany({
      where: { id: { in: ids } },
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  // Toàn bộ menu (ADMIN quản lý), dạng cây.
  async findAllTree(): Promise<MenuNode[]> {
    const menus = await this.prisma.systemMenu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  create(dto: CreateMenuDto) {
    return this.prisma.systemMenu.create({
      data: {
        label: dto.label,
        path: dto.path,
        icon: dto.icon,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: number, dto: UpdateMenuDto) {
    await this.ensureExists(id);
    return this.prisma.systemMenu.update({ where: { id }, data: dto });
  }

  // system_menus không có deleted_at → xóa cứng (role_menu_access cascade theo FK).
  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.systemMenu.delete({ where: { id } });
    return { message: 'Đã xóa menu' };
  }

  // Gán danh sách role được thấy menu: thay thế toàn bộ role_menu_access của menu đó.
  async setAccess(id: number, roles: Role[]) {
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.roleMenuAccess.deleteMany({ where: { menuId: id } }),
      this.prisma.roleMenuAccess.createMany({
        data: roles.map((role) => ({ role, menuId: id })),
        skipDuplicates: true,
      }),
    ]);
    return { menuId: id, roles };
  }

  private async ensureExists(id: number) {
    const menu = await this.prisma.systemMenu.findUnique({ where: { id } });
    if (!menu) {
      throw new NotFoundException(`Không tìm thấy menu có ID = ${id}`);
    }
    return menu;
  }
}
