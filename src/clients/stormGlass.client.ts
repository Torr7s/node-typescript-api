import { Request, Response } from '@src/shared/utils/request';

import { ClientRequestError } from '@src/shared/utils/errors/stormGlass/client-request.error';
import { StormGlassResponseError } from '@src/shared/utils/errors/stormGlass/response.error';

import { 
  NormalizedForecastPoint, 
  StormGlassForecastResponse, 
  StormGlassPoint, 
  StormGlassPointSource 
} from '@src/typings';

export class StormGlassClient {
  readonly stormGlassApiUrl: string = 'https://api.stormglass.io/v2';
  
  readonly stormGlassApiParams: string = 'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';
  readonly stormGlassApiSource: string = 'noaa';

  constructor(protected request: Request = new Request()) {};

  public async fetchPoints(lat: number, lng: number): Promise<NormalizedForecastPoint[]> {
    try {
      const url: string = `${this.stormGlassApiUrl}/weather/point?lat=${lat}&lng=${lng}&params=${this.stormGlassApiParams}&source=${this.stormGlassApiSource}`;

      const response: Response<StormGlassForecastResponse> = await this.request.get<StormGlassForecastResponse>(url, {
        headers: {
          Authorization: process.env.STORMGLASS_API_KEY as string
        }
      });

      const normalizedResponse: NormalizedForecastPoint[] = this.normalizeResponse(response.data);

      return normalizedResponse;
    } catch (error) {
      if (Request.isRequestError(error))
        throw new StormGlassResponseError(error);

      throw new ClientRequestError(error);
    }
  }

  private normalizeResponse(points: StormGlassForecastResponse): NormalizedForecastPoint[] {
    const pointParams: string[] = ['time', ...this.stormGlassApiParams.split(',')]

    const validPoints: (any | StormGlassPoint)[] = points
      .hours
      .map((point: StormGlassPoint): any | StormGlassPoint =>
        !pointParams.every((key: string): any => point[key]) ? [] : point)

    return validPoints
      .filter(this.isValidPoint.bind(this))
      .map((point: StormGlassPoint) => ({
        time: point.time,
        swellDirection: point.swellDirection[this.stormGlassApiSource],
        swellHeight: point.swellHeight[this.stormGlassApiSource],
        swellPeriod: point.swellPeriod[this.stormGlassApiSource],
        waveDirection: point.waveDirection[this.stormGlassApiSource],
        waveHeight: point.waveHeight[this.stormGlassApiSource],
        windDirection: point.windDirection[this.stormGlassApiSource],
        windSpeed: point.windSpeed[this.stormGlassApiSource]
      }));
  }

  private isValidPoint({ time, ...props }: Partial<StormGlassPoint>): boolean {
    const validPropsWithNoaa: boolean = Object.values(props).every((prop: StormGlassPointSource): boolean => !!prop[this.stormGlassApiSource]);

    return time && validPropsWithNoaa;
  }
}