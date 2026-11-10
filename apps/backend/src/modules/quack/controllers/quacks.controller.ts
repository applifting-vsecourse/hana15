import { QuacksService } from '@/modules/quack/services/quacks.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateQuackDto } from './dto/create-quack.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListQuacksDto } from './dto/list-quacks.dto';
import { PollResponseDto, QuackResponseDto } from './dto/quack.response.dto';
import { VotePollDto } from './dto/vote-poll.dto';

@ApiTags('quacks')
@Controller('quacks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QuacksController {
  constructor(private readonly quacksService: QuacksService) {}

  @Get()
  @ApiOperation({ summary: 'List quacks, optionally filtered by a search' })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid search' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async list(
    @User() user: Identity,
    @Query() query: ListQuacksDto,
  ): Promise<QuackResponseDto[]> {
    const quacks = await this.quacksService.getQuacks(user, {
      search: query.q,
      mine: query.mine,
    });
    return quacks.map(QuackResponseDto.fromDomain);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a quack' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateQuackDto,
  ): Promise<QuackResponseDto> {
    const quack = await this.quacksService.createQuack(user, {
      text: body.text,
      mood: body.mood,
      pollOptions: body.pollOptions,
    });
    return QuackResponseDto.fromDomain(quack);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'List the replies of a quack, oldest first' })
  @ApiResponse({ status: 200, type: [QuackResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such quack' })
  async listReplies(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<QuackResponseDto[]> {
    const replies = await this.quacksService.getReplies(user, id);
    return replies.map(QuackResponseDto.fromDomain);
  }

  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to a quack or to another reply' })
  @ApiResponse({ status: 201, type: QuackResponseDto })
  @ApiResponse({ status: 400, description: 'Empty or too long text' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'The answered quack is gone' })
  async reply(
    @User() user: Identity,
    @Param('id') id: string,
    @Body() body: CreateReplyDto,
  ): Promise<QuackResponseDto> {
    const reply = await this.quacksService.createReply(user, id, body.text);
    return QuackResponseDto.fromDomain(reply);
  }

  @Post(':id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vote in a poll, or move your vote to another option',
  })
  @ApiResponse({ status: 200, type: PollResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Option is not in this poll' })
  async vote(
    @User() user: Identity,
    @Param('id') id: string,
    @Body() body: VotePollDto,
  ): Promise<PollResponseDto> {
    const poll = await this.quacksService.vote(user, id, body.optionId);
    return PollResponseDto.fromDomain(poll);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete one of your own quacks (a moderator can delete any)',
  })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 403,
    description: "Not the quack's author or a moderator",
  })
  @ApiResponse({ status: 404, description: 'No such quack' })
  @ApiResponse({
    status: 409,
    description: 'Someone replied to it (see delete-with-replies story)',
  })
  async remove(@User() user: Identity, @Param('id') id: string): Promise<void> {
    await this.quacksService.deleteQuack(user, id);
  }
}
