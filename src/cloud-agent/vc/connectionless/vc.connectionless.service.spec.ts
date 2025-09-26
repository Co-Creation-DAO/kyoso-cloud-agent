import { Test, TestingModule } from '@nestjs/testing';
import { VcConnectionlessService } from './vc.connectionless.service';
import { ConfigModule } from '@nestjs/config';
import identusConfig from '../../../config/identus.config';
import { DidService } from '../../did/did.service';
import { HttpService } from '@nestjs/axios';
import { IdentusApiMock } from '../../../../test/mocks';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';

describe('VcConnectionlessService', () => {
  let service: VcConnectionlessService;
  let httpService: HttpService;
  let didService: DidService;

  beforeEach(async () => {
    jest.clearAllMocks();
    IdentusApiMock.clearMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [identusConfig],
        }),
      ],
      providers: [
        VcConnectionlessService,
        {
          provide: DidService,
          useValue: {
            getIssuerDid: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VcConnectionlessService>(VcConnectionlessService);
    httpService = module.get<HttpService>(HttpService);
    didService = module.get<DidService>(DidService);
  });

  describe('issuerCreateVcOffer', () => {
    const mockClaims = {
      name: 'Test User',
      age: '25',
      role: 'Developer',
    };

    it('should create VC offer successfully', async () => {
      const mockIssuerDid = {
        did: 'did:prism:issuer123',
        status: 'PUBLISHED',
      };
      const mockResponse = IdentusApiMock.getFixture(
        'vc-connectionless-issuer-create-offer',
      );

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(mockIssuerDid);
      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockResponse,
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {},
        } as AxiosResponse),
      );

      const result = await service.issuerCreateVcOffer(mockClaims);

      expect(result).toBeDefined();
      expect(result.recordId).toBe('vc-offer-record-123');
      expect(result.role).toBe('Issuer');
      expect(result.protocolState).toBe('OfferSent');
      expect(result.credentialFormat).toBe('JWT');
      expect(result.claims).toEqual({
        name: 'Test User',
        age: '25',
        role: 'Developer',
      });

      expect(didService.getIssuerDid).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining(
          '/issue-credentials/credential-offers/invitation',
        ),
        expect.objectContaining({
          claims: mockClaims,
          credentialFormat: 'JWT',
          issuingDID: 'did:prism:issuer123',
          automaticIssuance: true,
          domain: 'kyosodao.io',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should handle DID service errors', async () => {
      const didError = new Error('DID service unavailable');
      (didService.getIssuerDid as jest.Mock).mockRejectedValue(didError);

      await expect(service.issuerCreateVcOffer(mockClaims)).rejects.toThrow(
        'DID service unavailable',
      );
    });

    it('should handle HTTP service errors', async () => {
      const mockIssuerDid = {
        did: 'did:prism:issuer123',
        status: 'PUBLISHED',
      };
      const axiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
          headers: {},
        },
        config: {
          url: '/issue-credentials/credential-offers/invitation',
          method: 'post',
          data: JSON.stringify({
            claims: mockClaims,
            credentialFormat: 'JWT',
            issuingDID: 'did:prism:issuer123',
            automaticIssuance: true,
            domain: 'kyosodao.io',
          }),
        },
      } as AxiosError;

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(mockIssuerDid);
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        service.issuerCreateVcOffer(mockClaims),
      ).rejects.toMatchObject({
        isAxiosError: true,
        message: 'Request failed with status code 500',
      });
    });

    it('should handle network errors', async () => {
      const mockIssuerDid = {
        did: 'did:prism:issuer123',
        status: 'PUBLISHED',
      };
      const networkError = new Error('Network error');

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(mockIssuerDid);
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => networkError),
      );

      await expect(service.issuerCreateVcOffer(mockClaims)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle empty claims', async () => {
      const mockIssuerDid = {
        did: 'did:prism:issuer123',
        status: 'PUBLISHED',
      };
      const mockResponse = {
        ...IdentusApiMock.getFixture('vc-connectionless-issuer-create-offer'),
      };
      mockResponse.claims = {};

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(mockIssuerDid);
      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockResponse,
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {},
        } as AxiosResponse),
      );

      const result = await service.issuerCreateVcOffer({});

      expect(result).toBeDefined();
      expect(result.claims).toEqual({});
    });

    it('should handle 400 Bad Request error', async () => {
      const mockIssuerDid = {
        did: 'did:prism:issuer123',
        status: 'PUBLISHED',
      };
      const axiosError = {
        isAxiosError: true,
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Invalid claims format' },
          headers: {},
        },
        config: {
          url: '/issue-credentials/credential-offers/invitation',
          method: 'post',
        },
      } as AxiosError;

      (didService.getIssuerDid as jest.Mock).mockResolvedValue(mockIssuerDid);
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(
        service.issuerCreateVcOffer(mockClaims),
      ).rejects.toMatchObject({
        isAxiosError: true,
        message: 'Request failed with status code 400',
      });
    });
  });

  describe('holderAcceptInvitation', () => {
    const mockInvitation =
      'eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMi4wL2ludml0YXRpb24i';
    const mockApiKey = 'holder-api-key-123';

    it('should accept invitation successfully', async () => {
      const mockResponse = IdentusApiMock.getFixture(
        'vc-connectionless-holder-accept',
      );

      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse),
      );

      const result = await service.holderAcceptInvitation(
        mockInvitation,
        mockApiKey,
      );

      expect(result).toBeDefined();
      expect(result.recordId).toBe('vc-accept-record-456');
      expect(result.role).toBe('Holder');
      expect(result.protocolState).toBe('RequestSent');
      expect(result.credentialFormat).toBe('JWT');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining(
          '/issue-credentials/credential-offers/accept-invitation',
        ),
        expect.objectContaining({
          invitation: mockInvitation,
        }),
        expect.objectContaining({
          headers: {
            apikey: mockApiKey,
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should handle HTTP service errors', async () => {
      const httpError = new Error('Service unavailable');

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => httpError),
      );

      await expect(
        service.holderAcceptInvitation(mockInvitation, mockApiKey),
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle 404 Not Found error', async () => {
      const httpError = new Error('Service unavailable');

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => httpError),
      );

      await expect(
        service.holderAcceptInvitation(mockInvitation, mockApiKey),
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle invalid invitation format', async () => {
      const invalidInvitation = 'invalid-invitation-string';
      const httpError = new Error('Invalid invitation');

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => httpError),
      );

      await expect(
        service.holderAcceptInvitation(invalidInvitation, mockApiKey),
      ).rejects.toThrow('Invalid invitation');
    });

    it('should handle empty invitation string', async () => {
      const emptyInvitation = '';
      const mockResponse = {
        ...IdentusApiMock.getFixture('vc-connectionless-holder-accept'),
      };

      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse),
      );

      const result = await service.holderAcceptInvitation(
        emptyInvitation,
        mockApiKey,
      );

      expect(result).toBeDefined();
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining(
          '/issue-credentials/credential-offers/accept-invitation',
        ),
        expect.objectContaining({
          invitation: emptyInvitation,
        }),
        expect.any(Object),
      );
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => timeoutError),
      );

      await expect(
        service.holderAcceptInvitation(mockInvitation, mockApiKey),
      ).rejects.toThrow('timeout of 5000ms exceeded');
    });

    it('should handle authentication error', async () => {
      const authError = new Error('Unauthorized');

      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => authError),
      );

      await expect(
        service.holderAcceptInvitation(mockInvitation, mockApiKey),
      ).rejects.toThrow('Unauthorized');
    });
  });
});
