import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NovelService } from './novel.service';
import {
  presentNovelJobDetail,
  presentNovelJobEvents,
  presentNovelJobMetadata,
  presentNovelJobMetrics,
  presentNovelJobSummaries,
} from './novel.presenter';

const NovelJobPayloadSchema = z
  .object({
    title: z.string().trim().min(1, 'title is required'),
    premise: z.string().trim().min(1, 'premise is required'),
    genre: z.string().trim().min(1, 'genre is required'),
    subgenre: z.string().trim().min(1, 'subgenre is required'),
    targetWordCount: z.coerce.number().int().positive('targetWordCount must be a positive integer'),
    targetChapters: z.coerce.number().int().min(1, 'targetChapters must be at least 1'),
    humanLikeWriting: z.boolean().optional().default(false),
  })
  .strict();

const CreateNovelJobSchema = z
  .object({
    payload: NovelJobPayloadSchema,
    clientRequestId: z
      .string()
      .trim()
      .min(1, 'clientRequestId cannot be empty if provided')
      .max(128, 'clientRequestId must be 128 characters or fewer')
      .optional(),
  })
  .strict();

class CreateNovelJobDto extends createZodDto(CreateNovelJobSchema) {}

const NovelJobIdParamSchema = z
  .object({
    jobId: z.string().trim().min(1, 'jobId is required'),
  })
  .strict();

class NovelJobIdParamDto extends createZodDto(NovelJobIdParamSchema) {}

const NovelJobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);

const ListNovelJobsQuerySchema = z
  .object({
    limit: z.coerce.number()
      .int()
      .positive('limit must be greater than 0')
      .max(100, 'limit must not exceed 100')
      .optional(),
    status: z
      .union([NovelJobStatusSchema, NovelJobStatusSchema.array()])
      .optional(),
  })
  .strict();

class ListNovelJobsQueryDto extends createZodDto(ListNovelJobsQuerySchema) {}

const ListNovelJobEventsQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive('limit must be greater than 0').max(200, 'limit must not exceed 200').optional(),
    before: z.string().trim().min(1, 'before must be a non-empty ISO timestamp').optional(),
  })
  .strict();

class ListNovelJobEventsQueryDto extends createZodDto(ListNovelJobEventsQuerySchema) {}

@Controller('api/novel')
export class NovelController {
  constructor(private readonly novelService: NovelService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createJob(@Body() dto: CreateNovelJobDto) {
    const result = await this.novelService.enqueueNovelJob(dto);

    return {
      status: 'queued' as const,
      jobId: result.jobId,
      queue: result.queue,
    };
  }

  @Get(':jobId')
  async getJob(@Param() params: NovelJobIdParamDto) {
    const job = await this.novelService.getJob(params.jobId);
    return presentNovelJobDetail(job);
  }

  @Get()
  async listJobs(@Query() query: ListNovelJobsQueryDto) {
    const statuses = Array.isArray(query.status)
      ? query.status
      : typeof query.status === 'string'
        ? [query.status]
        : undefined;

    const jobs = await this.novelService.listRecentJobs({
      limit: query.limit,
      statuses,
    });
    const items = presentNovelJobSummaries(jobs);

    return {
      items,
      count: items.length,
    };
  }

  @Get(':jobId/events')
  async listJobEvents(@Param() params: NovelJobIdParamDto, @Query() query: ListNovelJobEventsQueryDto) {
    const events = await this.novelService.listJobEvents(params.jobId, {
      ...(typeof query.limit === 'number' ? { limit: query.limit } : {}),
      ...(query.before ? { before: query.before } : {}),
    });

    return presentNovelJobEvents(events);
  }

  @Get(':jobId/metrics')
  async getJobMetrics(@Param() params: NovelJobIdParamDto) {
    const metrics = await this.novelService.getJobMetrics(params.jobId);
    return presentNovelJobMetrics(params.jobId, metrics);
  }

  @Get(':jobId/metadata')
  async getJobMetadata(@Param() params: NovelJobIdParamDto) {
    const metadata = await this.novelService.getJobMetadata(params.jobId);
    return presentNovelJobMetadata(params.jobId, metadata);
  }
}
