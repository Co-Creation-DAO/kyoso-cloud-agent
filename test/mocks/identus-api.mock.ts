import * as path from 'path';
import * as fs from 'fs';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

export interface MockResponse {
  status: number;
  data: any;
  headers?: Record<string, string>;
}

export class IdentusApiMock {
  private static fixtures: Map<string, any> = new Map();
  private static mockResponses: Map<string, MockResponse> = new Map();

  static {
    this.loadFixtures();
  }

  private static loadFixtures() {
    const fixturesDir = path.join(__dirname, 'fixtures');
    const files = [
      'did-issuer.json',
      'did-list-empty.json',
      'did-list-published.json',
      'did-create-response.json',
      'did-created-status.json',
      'did-publish-response.json',
      'did-publication-pending.json',
      'vc-records-list.json',
      'vc-record-single.json',
      'vc-record-credential-received.json',
      'vc-holder-accept-response.json',
      'vc-issuer-issue-response.json',
      'vc-connectionless-issuer-create-offer.json',
      'vc-connectionless-issuer-create-offer-with-url.json',
      'vc-connectionless-holder-accept.json',
      'connection-create-response.json',
      'connection-accept-response.json',
      'connection-established.json',
      'vc-offer-received.json',
    ];

    files.forEach((file) => {
      const filePath = path.join(fixturesDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const key = file.replace('.json', '');
        this.fixtures.set(key, JSON.parse(content));
      }
    });
  }

  static getFixture(name: string): any {
    return this.fixtures.get(name);
  }

  static setMockResponse(url: string, response: MockResponse) {
    this.mockResponses.set(url, response);
  }

  static clearMocks() {
    this.mockResponses.clear();
  }

  static createAxiosResponse(
    mockResponse: MockResponse,
    config?: AxiosRequestConfig,
  ): AxiosResponse {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      400: 'Bad Request',
      404: 'Not Found',
      500: 'Internal Server Error',
    };

    return {
      status: mockResponse.status,
      data: mockResponse.data,
      headers: mockResponse.headers || {},
      config: config || {},
      statusText: statusTexts[mockResponse.status] || 'OK',
    } as AxiosResponse;
  }

  static mockAxios(axios: any) {
    if (!axios.get || !axios.post) {
      throw new Error('Invalid axios instance');
    }

    axios.get = jest
      .fn()
      .mockImplementation((url: string, config?: AxiosRequestConfig) => {
        const mockResponse = this.findMockResponse(url);
        if (mockResponse) {
          if (mockResponse.status >= 400) {
            return Promise.reject(
              this.createAxiosResponse(mockResponse, config),
            );
          }
          return Promise.resolve(
            this.createAxiosResponse(mockResponse, config),
          );
        }
        return Promise.reject(new Error(`No mock found for GET ${url}`));
      });

    axios.post = jest
      .fn()
      .mockImplementation(
        (url: string, _data?: any, config?: AxiosRequestConfig) => {
          const mockResponse = this.findMockResponse(url);
          if (mockResponse) {
            if (mockResponse.status >= 400) {
              return Promise.reject(
                this.createAxiosResponse(mockResponse, config),
              );
            }
            return Promise.resolve(
              this.createAxiosResponse(mockResponse, config),
            );
          }
          return Promise.reject(new Error(`No mock found for POST ${url}`));
        },
      );

    return axios;
  }

  static mockHttpServiceGet(httpService: any) {
    httpService.get = jest
      .fn()
      .mockImplementation(
        (
          url: string,
          config?: AxiosRequestConfig,
        ): Observable<AxiosResponse> => {
          const mockResponse = this.findMockResponse(url);
          if (mockResponse) {
            return of({
              status: mockResponse.status,
              data: mockResponse.data,
              headers: mockResponse.headers || {},
              config: config || {},
              statusText: 'OK',
            } as AxiosResponse);
          }
          throw new Error(`No mock found for GET ${url}`);
        },
      );
    return httpService;
  }

  static mockHttpServicePost(httpService: any) {
    httpService.post = jest
      .fn()
      .mockImplementation(
        (
          url: string,
          _data?: any,
          config?: AxiosRequestConfig,
        ): Observable<AxiosResponse> => {
          const mockResponse = this.findMockResponse(url);
          if (mockResponse) {
            return of({
              status: mockResponse.status,
              data: mockResponse.data,
              headers: mockResponse.headers || {},
              config: config || {},
              statusText: 'OK',
            } as AxiosResponse);
          }
          throw new Error(`No mock found for POST ${url}`);
        },
      );
    return httpService;
  }

  private static findMockResponse(url: string): MockResponse | undefined {
    for (const [pattern, response] of this.mockResponses.entries()) {
      if (url.includes(pattern)) {
        return response;
      }
    }
    return undefined;
  }

  static setupScenario(scenario: string) {
    this.clearMocks();

    switch (scenario) {
      case 'issuer-exists':
        this.setMockResponse('/did-registrar/dids', {
          status: 200,
          data: this.getFixture('did-list-published'),
        });
        break;

      case 'issuer-not-exists':
        this.setMockResponse('/did-registrar/dids', {
          status: 200,
          data: this.getFixture('did-list-empty'),
        });
        break;

      case 'publication-pending':
        const pendingList = JSON.parse(
          JSON.stringify(this.getFixture('did-list-published')),
        );
        pendingList.contents[0].status = 'PUBLICATION_PENDING';
        pendingList.contents[0].longFormDid = 'did:prism:pendinglong123';
        this.setMockResponse('/did-registrar/dids', {
          status: 200,
          data: pendingList,
        });
        this.setMockResponse('did:prism:pendinglong123', {
          status: 200,
          data: this.getFixture('did-issuer'),
        });
        break;

      case 'create-and-publish':
        this.setMockResponse('/did-registrar/dids', {
          status: 200,
          data: this.getFixture('did-list-empty'),
        });
        this.setMockResponse('/did-registrar/dids', {
          status: 201,
          data: this.getFixture('did-create-response'),
        });
        this.setMockResponse('/publications', {
          status: 202,
          data: this.getFixture('did-publish-response'),
        });
        break;

      case 'error-404':
        this.setMockResponse('/did-registrar/dids', {
          status: 404,
          data: { error: 'Not Found' },
        });
        break;

      case 'network-error':
        // No mocks set - will trigger errors
        break;

      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }
}
