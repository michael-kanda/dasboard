import type { ProjectSyncJobType } from './job-queue';

const JOB_TYPE_ORDER: ProjectSyncJobType[] = ['dashboard', 'gsc-history', 'indexing'];

export function pickNextProjectSyncJobType({
  remainingQuota,
  processedByType,
  exhaustedTypes,
  fits,
}: {
  remainingQuota: Record<ProjectSyncJobType, number>;
  processedByType: Record<ProjectSyncJobType, number>;
  exhaustedTypes: Set<ProjectSyncJobType>;
  fits: (type: ProjectSyncJobType) => boolean;
}): ProjectSyncJobType | undefined {
  return JOB_TYPE_ORDER
    .filter((type) => remainingQuota[type] > 0 && !exhaustedTypes.has(type) && fits(type))
    .sort((a, b) => {
      const processedDifference = processedByType[a] - processedByType[b];
      if (processedDifference !== 0) return processedDifference;
      return JOB_TYPE_ORDER.indexOf(a) - JOB_TYPE_ORDER.indexOf(b);
    })[0];
}
