import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  AudioWaveformIcon,
  BadgeCheckIcon,
  BellIcon,
  BookOpenIcon,
  BotIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  CircleDollarSignIcon,
  CircleUserIcon,
  CommandIcon,
  CopyIcon,
  CreditCardIcon,
  EarthIcon,
  EarthLockIcon,
  EditIcon,
  ExternalLinkIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderSyncIcon,
  ForwardIcon,
  FrameIcon,
  GalleryVerticalEndIcon,
  HandCoinsIcon,
  IdCardIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  LogOutIcon,
  LucideProps,
  MapIcon,
  MoreHorizontalIcon,
  PieChartIcon,
  PlusIcon,
  RefreshCwIcon,
  Settings2Icon,
  SnowflakeIcon,
  SparklesIcon,
  SquareTerminalIcon,
  Trash2Icon,
  TrashIcon,
  TriangleAlertIcon,
  UnlockIcon,
  UserPlusIcon,
  WandSparklesIcon,
} from 'lucide-react';
import { HTMLAttributes, RefAttributes } from 'react';

import { IconNames } from '@/enums';
import { cn } from '@/theme/utils';

type CustomIconProps = {
  name: IconNames;
} & HTMLAttributes<HTMLOrSVGElement>;

function CustomIcon({ name, ...rest }: CustomIconProps) {
  return (
    <svg
      {...rest}
      className={cn(
        'pointer-events-none flex items-center justify-center',
        rest.className,
      )}
    >
      <use href={`#${name}-icon`} />
    </svg>
  );
}

const LIB_ICONS = {
  CameraIcon: CameraIcon,
  ArrowDownIcon: ArrowDownIcon,
  ArrowRightIcon: ArrowRightIcon,
  ArrowUpIcon: ArrowUpIcon,
  CheckIcon: CheckIcon,
  CopyIcon: CopyIcon,
  CreditCardIcon: CreditCardIcon,
  EditIcon: EditIcon,
  FolderOpenIcon: FolderOpenIcon,
  FolderSyncIcon: FolderSyncIcon,
  HandCoinsIcon: HandCoinsIcon,
  IdCardIcon: IdCardIcon,
  InfoIcon: InfoIcon,
  KeyIcon: KeyIcon,
  LockIcon: LockIcon,
  SnowflakeIcon: SnowflakeIcon,
  TriangleAlertIcon: TriangleAlertIcon,
  UnlockIcon: UnlockIcon,
  AudioWaveformIcon: AudioWaveformIcon,
  BadgeCheckIcon: BadgeCheckIcon,
  BellIcon: BellIcon,
  BookOpenIcon: BookOpenIcon,
  BotIcon: BotIcon,
  ChevronRightIcon: ChevronRightIcon,
  ChevronsUpDownIcon: ChevronsUpDownIcon,
  CommandIcon: CommandIcon,
  FolderIcon: FolderIcon,
  ForwardIcon: ForwardIcon,
  FrameIcon: FrameIcon,
  GalleryVerticalEndIcon: GalleryVerticalEndIcon,
  LogOutIcon: LogOutIcon,
  MapIcon: MapIcon,
  MoreHorizontalIcon: MoreHorizontalIcon,
  PieChartIcon: PieChartIcon,
  PlusIcon: PlusIcon,
  Settings2Icon: Settings2Icon,
  SparklesIcon: SparklesIcon,
  SquareTerminalIcon: SquareTerminalIcon,
  TrashIcon: TrashIcon,
  Trash2Icon: Trash2Icon,
  ChevronDownIcon: ChevronDownIcon,
  ChevronUpIcon: ChevronUpIcon,
  CircleUserIcon: CircleUserIcon,
  UserPlusIcon: UserPlusIcon,
  RefreshCwIcon: RefreshCwIcon,
  WandSparklesIcon: WandSparklesIcon,
  CircleDollarSignIcon: CircleDollarSignIcon,
  EarthIcon: EarthIcon,
  EarthLockIcon: EarthLockIcon,
  ExternalLinkIcon: ExternalLinkIcon,
  CalendarIcon: CalendarIcon,
};

type LibIconProps = {
  name: keyof typeof LIB_ICONS;
} & Omit<LucideProps, 'ref'> &
  RefAttributes<SVGSVGElement>;

function LibIcon({ name, ...rest }: LibIconProps) {
  const Component = LIB_ICONS[name];

  return <Component {...rest} />;
}

type Props<T extends IconNames | keyof typeof LIB_ICONS> = T extends IconNames
  ? CustomIconProps
  : T extends keyof typeof LIB_ICONS
    ? LibIconProps
    : undefined;

export default function UiIcon<T extends IconNames | keyof typeof LIB_ICONS>({
  name,
  ...rest
}: Props<T>) {
  if (Object.values(IconNames).includes(name as unknown as IconNames)) {
    return (
      <CustomIcon {...(rest as unknown as CustomIconProps)} name={name as IconNames} />
    );
  }

  if (name in LIB_ICONS) {
    return (
      <LibIcon
        {...(rest as unknown as LibIconProps)}
        name={name as keyof typeof LIB_ICONS}
      />
    );
  } else {
    throw new Error(`Icon with name "${name}" not found.`);
  }
}
