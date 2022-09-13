import { AxiosError } from 'axios';
import config, { IConfig } from 'config';

import { Request, Response } from '@src/shared/utils/request';

import { ClientRequestError } from '@src/shared/utils/errors/stormGlass/client-request.error';
import { StormGlassResponseError } from '@src/shared/utils/errors/stormGlass/response.error';

const stormGlassResourceConfig: IConfig = config.get('app.resources.stormGlass');

export class StormGlassClient {
  readonly stormGlassApiParams: string = 'swellDirection,swellHeight,swellPeriod,waveDirection,waveHeight,windDirection,windSpeed';
  readonly stormGlassApiSource: string = 'noaa';

  constructor(protected request: Request = new Request()) { };

  public async fetchPoints(lat: number, lng: number): Promise<NormalizedForecastPoint[]> {
    try {
      const url: string = `${stormGlassResourceConfig.get(
        'apiUrl'
      )}/weather/point?lat=${lat}&lng=${lng}&params=${this.stormGlassApiParams}&source=${this.stormGlassApiSource}`;

      const response: Response<StormGlassForecastResponse> = await this.request.get<StormGlassForecastResponse>(url, {
        headers: {
          Authorization: stormGlassResourceConfig.get('apiToken')
        }
      });

      return this.normalizeResponse(response.data);
    } catch (error) {
      const axiosError: AxiosError = error as AxiosError;

      if (Request.isRequestError(axiosError))
        throw new StormGlassResponseError(axiosError);

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