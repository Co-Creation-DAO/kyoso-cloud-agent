import { Test, TestingModule } from '@nestjs/testing';
import { DidService } from './did.service';
import { ConfigModule } from '@nestjs/config';
import identusConfig from '../../config/identus.config';
import axios from 'axios';
import { IdentusApiMock } from '../../../test/mocks';
import { DIDStatus } from './dto/identus/did-status.dto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DidService', () => {
  let service: DidService;

  beforeEach(async () => {
    jest.clearAllMocks();
    IdentusApiMock.clearMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [identusConfig],
        }),
      ],
      providers: [DidService],
    }).compile();

    service = module.get<DidService>(DidService);
    IdentusApiMock.mockAxios(mockedAxios);
  });

  describe('findOne', () => {
    it('should return DID when it exists', async () => {
      const apiKey = 'test-api-key';
      IdentusApiMock.setMockResponse('/did-registrar/dids', {
        status: 200,
        data: IdentusApiMock.getFixture('did-list-published'),
      });

      const result = await service.findOne(apiKey);

      expect(result).toBeDefined();
      expect(result?.did).toBe(
        'did:prism:89395b389d59c8ebbadb221c361622f9c722a65632a3a874ec1eb10dfcddedf1',
      );
      expect(result?.status).toBe('PUBLISHED');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/did-registrar/dids'),
        expect.objectContaining({
          headers: { apikey: apiKey },
          params: { offset: 0, limit: 1 },
        }),
      );
    });

    it('should return null when DID does not exist', async () => {
      const apiKey = 'test-api-key';
      IdentusApiMock.setMockResponse('/did-registrar/dids', {
        status: 200,
        data: IdentusApiMock.getFixture('did-list-empty'),
      });

      const result = await service.findOne(apiKey);

      expect(result).toBeNull();
    });

    it('should re-fetch when status is PUBLICATION_PENDING', async () => {
      const apiKey = 'test-api-key';
      const pendingList = JSON.parse(
        JSON.stringify(IdentusApiMock.getFixture('did-list-published')),
      );
      pendingList.contents[0].status = DIDStatus.PUBLICATION_PENDING;
      pendingList.contents[0].longFormDid = 'did:prism:longform123';

      const publishedDid = IdentusApiMock.getFixture('did-issuer');

      mockedAxios.get
        .mockResolvedValueOnce({
          data: pendingList,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        })
        .mockResolvedValueOnce({
          data: publishedDid,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      const result = await service.findOne(apiKey);

      expect(result).toBeDefined();
      expect(result?.status).toBe('PUBLISHED');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('create', () => {
    it('should create a new DID', async () => {
      const apiKey = 'test-api-key';
      const mockResponse = IdentusApiMock.getFixture('did-create-response');

      IdentusApiMock.setMockResponse('/did-registrar/dids', {
        status: 201,
        data: mockResponse,
      });

      const result = await service.create(apiKey);

      expect(result).toBeDefined();
      expect(result.longFormDid).toContain('did:prism:');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/did-registrar/dids'),
        expect.objectContaining({
          documentTemplate: expect.objectContaining({
            publicKeys: expect.arrayContaining([
              expect.objectContaining({ purpose: 'authentication' }),
              expect.objectContaining({ purpose: 'assertionMethod' }),
            ]),
          }),
        }),
        expect.objectContaining({
          headers: { apikey: apiKey },
        }),
      );
    });

    it('should handle creation errors', async () => {
      const apiKey = 'test-api-key';
      IdentusApiMock.clearMocks(); // No mock = error

      await expect(service.create(apiKey)).rejects.toThrow();
    });
  });

  describe('publish', () => {
    it('should publish a DID', async () => {
      const apiKey = 'test-api-key';
      const did = 'did:prism:test123';
      const mockResponse = IdentusApiMock.getFixture('did-publish-response');

      IdentusApiMock.setMockResponse('/publications', {
        status: 202,
        data: mockResponse,
      });

      const result = await service.publish(apiKey, did);

      expect(result).toBeDefined();
      expect(result.scheduledOperation).toBeDefined();
      expect(result.scheduledOperation.id).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/did-registrar/dids/${did}/publications`),
        {},
        expect.objectContaining({
          headers: { apikey: apiKey },
        }),
      );
    });
  });

  describe('findOneByLongFormDid', () => {
    it('should fetch DID by long form DID', async () => {
      const apiKey = 'test-api-key';
      const longFormDid = 'did:prism:longform123';
      const mockResponse = IdentusApiMock.getFixture('did-created-status');

      IdentusApiMock.setMockResponse(longFormDid, {
        status: 200,
        data: mockResponse,
      });

      const result = await service.findOneByLongFormDid(apiKey, longFormDid);

      expect(result).toBeDefined();
      expect(result.status).toBe('CREATED');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(longFormDid),
        expect.objectContaining({
          headers: { apikey: apiKey },
        }),
      );
    });

    it('should throw on 404', async () => {
      const apiKey = 'test-api-key';
      const longFormDid = 'did:prism:notfound';

      mockedAxios.get.mockRejectedValueOnce(
        new Error('Request failed with status code 404'),
      );

      await expect(
        service.findOneByLongFormDid(apiKey, longFormDid),
      ).rejects.toThrow();
    });
  });

  describe('getIssuerDid', () => {
    it('should return existing Issuer DID when published', async () => {
      IdentusApiMock.setupScenario('issuer-exists');

      const result = await service.getIssuerDid();

      expect(result).toBeDefined();
      expect(result.status).toBe('PUBLISHED');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should create and publish when Issuer DID does not exist', async () => {
      const createdDid = IdentusApiMock.getFixture('did-created-status');
      const publishedDid = JSON.parse(JSON.stringify(createdDid));
      publishedDid.status = 'PUBLISHED';

      mockedAxios.get
        .mockResolvedValueOnce({
          data: IdentusApiMock.getFixture('did-list-empty'),
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        })
        .mockResolvedValueOnce({
          data: createdDid,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        })
        .mockResolvedValueOnce({
          data: publishedDid,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      mockedAxios.post
        .mockResolvedValueOnce({
          data: IdentusApiMock.getFixture('did-create-response'),
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {},
        })
        .mockResolvedValueOnce({
          data: IdentusApiMock.getFixture('did-publish-response'),
          status: 202,
          statusText: 'Accepted',
          headers: {},
          config: {},
        });

      const result = await service.getIssuerDid();

      expect(result).toBeDefined();
      expect(result.status).toBe('PUBLISHED');
      expect(mockedAxios.get).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // create + publish
    });

    it('should handle PUBLICATION_PENDING status', async () => {
      const pendingList = JSON.parse(
        JSON.stringify(IdentusApiMock.getFixture('did-list-published')),
      );
      pendingList.contents[0].status = 'PUBLICATION_PENDING';
      pendingList.contents[0].longFormDid = 'did:prism:pendinglong123';

      const publishedDid = IdentusApiMock.getFixture('did-issuer');

      mockedAxios.get
        .mockResolvedValueOnce({
          data: pendingList,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        })
        .mockResolvedValueOnce({
          data: publishedDid,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      const result = await service.getIssuerDid();

      expect(result).toBeDefined();
      expect(result.status).toBe('PUBLISHED');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // list + refetch
    });

    it('should retry publish if status is CREATED', async () => {
      // First call: list with CREATED status
      const createdList = JSON.parse(
        JSON.stringify(IdentusApiMock.getFixture('did-list-published')),
      );
      createdList.contents[0].status = 'CREATED';

      const publishedDid = IdentusApiMock.getFixture('did-issuer');

      mockedAxios.get
        .mockResolvedValueOnce({
          data: createdList,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        })
        .mockResolvedValueOnce({
          data: publishedDid,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      mockedAxios.post.mockResolvedValueOnce({
        data: IdentusApiMock.getFixture('did-publish-response'),
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config: {},
      });

      const result = await service.getIssuerDid();

      expect(result).toBeDefined();
      expect(result.status).toBe('PUBLISHED');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/publications'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should handle errors during creation gracefully', async () => {
      // First call returns empty list
      mockedAxios.get.mockResolvedValueOnce({
        data: IdentusApiMock.getFixture('did-list-empty'),
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      // Create fails
      mockedAxios.post.mockRejectedValueOnce(new Error('Creation failed'));

      await expect(service.getIssuerDid()).rejects.toThrow('Creation failed');
    });
  });
});
