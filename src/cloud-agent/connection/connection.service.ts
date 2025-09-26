import { Injectable, Logger, Inject } from '@nestjs/common';
import { identusConfig } from '../../config';
import type { ConfigType } from '@nestjs/config';
import type { ConnectionDto, CreateConnectionRequestDto } from './dto/identus';
import axios from 'axios';

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);

  constructor(
    @Inject(identusConfig.KEY)
    private readonly identusConf: ConfigType<typeof identusConfig>,
  ) {}

  /**
   * Connectionを作成する
   * @param body
   * @param apiKey
   * @returns
   */
  async create(
    body: CreateConnectionRequestDto,
    apiKey: string,
  ): Promise<ConnectionDto> {
    const url = `${this.identusConf.cloudAgentUrl}/connections`;

    try {
      const { data } = await axios.post<ConnectionDto>(url, body, {
        headers: {
          apikey: apiKey,
        },
      });

      this.logger.log(`Connection created: ${data.connectionId}`);
      return data;
    } catch (error) {
      this.logger.error('Failed to create connection', error);
      throw error;
    }
  }

  /**
   * HolderがConnectionを受け入れる（Step 2）
   * @param invitation
   * @returns
   */
  async acceptInvitation(
    invitation: string,
    apiKey: string,
  ): Promise<ConnectionDto> {
    const url = `${this.identusConf.cloudAgentUrl}/connection-invitations`;

    try {
      const { data } = await axios.post<ConnectionDto>(
        url,
        {
          invitation: invitation,
        },
        {
          headers: {
            apikey: apiKey,
          },
        },
      );

      this.logger.log(`Connection invitation accepted: ${data.connectionId}`);
      return data;
    } catch (error) {
      this.logger.error('Failed to accept connection invitation', error);
      throw error;
    }
  }

  /**
   * Get connection by ID
   * @param connectionId
   * @param apiKey
   * @returns
   */
  async getConnectionById(
    connectionId: string,
    apiKey: string,
  ): Promise<ConnectionDto> {
    const url = `${this.identusConf.cloudAgentUrl}/connections/${connectionId}`;

    try {
      const { data } = await axios.get<ConnectionDto>(url, {
        headers: {
          apikey: apiKey,
        },
      });

      this.logger.log(`Retrieved connection ${connectionId}: ${data.state}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get connection ${connectionId}`, error);
      throw error;
    }
  }
}
