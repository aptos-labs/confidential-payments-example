'use client'

import {
  AudioWaveform,
  BookOpen,
  Bot,
  ChevronRight,
  ChevronsUpDown,
  Command,
  Folder,
  Forward,
  Frame,
  GalleryVerticalEnd,
  LogOut,
  type LucideIcon,
  Map,
  MoonIcon,
  MoreHorizontal,
  PieChart,
  Plus,
  Settings2,
  SquareTerminal,
  SunIcon,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import * as React from 'react'
import { useCallback } from 'react'

import { ErrorHandler } from '@/helpers'
import { authStore } from '@/store/auth'
import { UiAvatar, UiAvatarFallback, UiAvatarImage } from '@/ui/UiAvatar'
import {
  UiCollapsible,
  UiCollapsibleContent,
  UiCollapsibleTrigger,
} from '@/ui/UiCollapsible'
import {
  UiDropdownMenu,
  UiDropdownMenuContent,
  UiDropdownMenuGroup,
  UiDropdownMenuItem,
  UiDropdownMenuLabel,
  UiDropdownMenuSeparator,
  UiDropdownMenuShortcut,
  UiDropdownMenuTrigger,
} from '@/ui/UiDropdownMenu'
import {
  UiSidebar,
  UiSidebarContent,
  UiSidebarFooter,
  UiSidebarGroup,
  UiSidebarGroupLabel,
  UiSidebarHeader,
  UiSidebarMenu,
  UiSidebarMenuAction,
  UiSidebarMenuButton,
  UiSidebarMenuItem,
  UiSidebarMenuSub,
  UiSidebarMenuSubButton,
  UiSidebarMenuSubItem,
  UiSidebarRail,
  useUiSidebar,
} from '@/ui/UiSidebar'
import { UiSwitch } from '@/ui/UiSwitch'

// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
    {
      name: 'Evil Corp.',
      logo: Command,
      plan: 'Free',
    },
  ],
  navMain: [
    {
      title: 'Playground',
      url: '#',
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: 'History',
          url: '#',
        },
        {
          title: 'Starred',
          url: '#',
        },
        {
          title: 'Settings',
          url: '#',
        },
      ],
    },
    {
      title: 'Models',
      url: '#',
      icon: Bot,
      items: [
        {
          title: 'Genesis',
          url: '#',
        },
        {
          title: 'Explorer',
          url: '#',
        },
        {
          title: 'Quantum',
          url: '#',
        },
      ],
    },
    {
      title: 'Documentation',
      url: '#',
      icon: BookOpen,
      items: [
        {
          title: 'Introduction',
          url: '#',
        },
        {
          title: 'Get Started',
          url: '#',
        },
        {
          title: 'Tutorials',
          url: '#',
        },
        {
          title: 'Changelog',
          url: '#',
        },
      ],
    },
    {
      title: 'Settings',
      url: '#',
      icon: Settings2,
      items: [
        {
          title: 'General',
          url: '#',
        },
        {
          title: 'Team',
          url: '#',
        },
        {
          title: 'Billing',
          url: '#',
        },
        {
          title: 'Limits',
          url: '#',
        },
      ],
    },
  ],
  projects: [
    {
      name: 'Design Engineering',
      url: '#',
      icon: Frame,
    },
    {
      name: 'Sales & Marketing',
      url: '#',
      icon: PieChart,
    },
    {
      name: 'Travel',
      url: '#',
      icon: Map,
    },
  ],
}

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof UiSidebar>) {
  return (
    <UiSidebar collapsible='icon' {...props}>
      <UiSidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </UiSidebarHeader>
      <UiSidebarContent>
        {/*<NavMain items={data.navMain} />*/}
        {/*<NavProjects projects={data.projects} />*/}
      </UiSidebarContent>
      <UiSidebarFooter>
        <NavUser user={data.user} />
      </UiSidebarFooter>
      <UiSidebarRail />
    </UiSidebar>
  )
}

const ThemeSwitcher = () => {
  const { theme, setTheme, systemTheme } = useTheme()

  const currentTheme = theme === 'system' ? systemTheme : theme

  const toggleTheme = useCallback(() => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }, [currentTheme, setTheme])

  return (
    <div className='mr-auto flex items-center gap-2'>
      <SunIcon className='size-4' />
      <UiSwitch
        checked={currentTheme === 'dark'}
        onCheckedChange={() => toggleTheme()}
      />
      <MoonIcon className='size-4' />
    </div>
  )
}

// eslint-disable-next-line unused-imports/no-unused-vars
function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  return (
    <UiSidebarGroup>
      <UiSidebarGroupLabel>Platform</UiSidebarGroupLabel>
      <UiSidebarMenu>
        {items.map(item => (
          <UiCollapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className='group/collapsible'
          >
            <UiSidebarMenuItem>
              <UiCollapsibleTrigger asChild>
                <UiSidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                </UiSidebarMenuButton>
              </UiCollapsibleTrigger>
              <UiCollapsibleContent>
                <UiSidebarMenuSub>
                  {item.items?.map(subItem => (
                    <UiSidebarMenuSubItem key={subItem.title}>
                      <UiSidebarMenuSubButton asChild>
                        <a href={subItem.url}>
                          <span>{subItem.title}</span>
                        </a>
                      </UiSidebarMenuSubButton>
                    </UiSidebarMenuSubItem>
                  ))}
                </UiSidebarMenuSub>
              </UiCollapsibleContent>
            </UiSidebarMenuItem>
          </UiCollapsible>
        ))}
      </UiSidebarMenu>
    </UiSidebarGroup>
  )
}

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useUiSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])

  if (!activeTeam) {
    return null
  }

  return (
    <UiSidebarMenu>
      <UiSidebarMenuItem>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger asChild>
            <UiSidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <activeTeam.logo className='size-4' />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {activeTeam.name}
                </span>
                <span className='truncate text-xs'>{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className='ml-auto' />
            </UiSidebarMenuButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <UiDropdownMenuLabel className='text-xs text-muted-foreground'>
              Teams
            </UiDropdownMenuLabel>
            {teams.map((team, index) => (
              <UiDropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className='gap-2 p-2'
              >
                <div className='flex size-6 items-center justify-center rounded-sm border'>
                  <team.logo className='size-4 shrink-0' />
                </div>
                {team.name}
                <UiDropdownMenuShortcut>⌘{index + 1}</UiDropdownMenuShortcut>
              </UiDropdownMenuItem>
            ))}
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem className='gap-2 p-2'>
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Plus className='size-4' />
              </div>
              <div className='font-medium text-muted-foreground'>Add team</div>
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </UiSidebarMenuItem>
    </UiSidebarMenu>
  )
}

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useUiSidebar()

  return (
    <UiSidebarGroup className='group-data-[collapsible=icon]:hidden'>
      <UiSidebarGroupLabel>Projects</UiSidebarGroupLabel>
      <UiSidebarMenu>
        {projects.map(item => (
          <UiSidebarMenuItem key={item.name}>
            <UiSidebarMenuButton asChild>
              <a href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </a>
            </UiSidebarMenuButton>
            <UiDropdownMenu>
              <UiDropdownMenuTrigger asChild>
                <UiSidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className='sr-only'>More</span>
                </UiSidebarMenuAction>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent
                className='w-48 rounded-lg'
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <UiDropdownMenuItem>
                  <Folder className='text-muted-foreground' />
                  <span>View Project</span>
                </UiDropdownMenuItem>
                <UiDropdownMenuItem>
                  <Forward className='text-muted-foreground' />
                  <span>Share Project</span>
                </UiDropdownMenuItem>
                <UiDropdownMenuSeparator />
                <UiDropdownMenuItem>
                  <Trash2 className='text-muted-foreground' />
                  <span>Delete Project</span>
                </UiDropdownMenuItem>
              </UiDropdownMenuContent>
            </UiDropdownMenu>
          </UiSidebarMenuItem>
        ))}
        <UiSidebarMenuItem>
          <UiSidebarMenuButton className='text-sidebar-foreground/70'>
            <MoreHorizontal className='text-sidebar-foreground/70' />
            <span>More</span>
          </UiSidebarMenuButton>
        </UiSidebarMenuItem>
      </UiSidebarMenu>
    </UiSidebarGroup>
  )
}

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const router = useRouter()

  const { isMobile } = useUiSidebar()
  const logout = authStore.useLogout()

  const tryLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      ErrorHandler.process(error)
    }
  }

  return (
    <UiSidebarMenu>
      <UiSidebarMenuItem>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger asChild>
            <UiSidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <UiAvatar className='h-8 w-8 rounded-lg'>
                <UiAvatarImage src={user.avatar} alt={user.name} />
                <UiAvatarFallback className='rounded-lg'>CN</UiAvatarFallback>
              </UiAvatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </UiSidebarMenuButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent
            className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <UiDropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <UiAvatar className='h-8 w-8 rounded-lg'>
                  <UiAvatarImage src={user.avatar} alt={user.name} />
                  <UiAvatarFallback className='rounded-lg'>CN</UiAvatarFallback>
                </UiAvatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
              </div>
            </UiDropdownMenuLabel>
            <UiDropdownMenuSeparator />
            <UiDropdownMenuGroup>
              <UiDropdownMenuItem>
                <ThemeSwitcher />
              </UiDropdownMenuItem>
            </UiDropdownMenuGroup>
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem onClick={tryLogout}>
              <LogOut />
              Log out
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </UiSidebarMenuItem>
    </UiSidebarMenu>
  )
}
