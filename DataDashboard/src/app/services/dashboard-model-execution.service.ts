import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { combineLatest, map, Observable, switchMap, take } from 'rxjs';
import {
  ExecutableAsset,
  MlGuiAsset,
  ModelExecutionRequest,
  ModelExecutionResult,
} from '../models/ml-gui-asset';
import { DashboardConnectorContextService } from './dashboard-connector-context.service';
import { DashboardMlBrowserService } from './dashboard-ml-browser.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardModelExecutionService {
  private readonly http = inject(HttpClient);
  private readonly context = inject(DashboardConnectorContextService);
  private readonly browserService = inject(DashboardMlBrowserService);

  getExecutableAssets(): Observable<ExecutableAsset[]> {
    return this.browserService.getMachineLearningAssets().pipe(
      map(assets =>
        assets
          .filter(asset => this.isTechnicallyExecutable(asset))
          .filter(asset => !!asset.isLocal || !!asset.hasAgreement)
          .map(asset => this.toExecutableAsset(asset)),
      ),
    );
  }

  executeModel(request: ModelExecutionRequest): Observable<ModelExecutionResult> {
    return combineLatest([this.context.activeConfig$, this.context.inferApiUrl$]).pipe(
      take(1),
      switchMap(([activeConfig, inferApiUrl]) => {
        const headers = this.context.withApiTokenHeader(activeConfig, {
          'content-type': 'application/json',
          accept: 'application/json',
        });

        const body: Record<string, unknown> = {
          assetId: request.assetId,
          method: request.method || 'POST',
          path: request.path || '/infer',
          headers: request.headers || { 'Content-Type': 'application/json' },
          payload: request.payload,
        };

        return this.http.post<unknown>(inferApiUrl, body, { headers }).pipe(
          map(response => ({
            status: 'success' as const,
            assetId: request.assetId,
            output: response,
            timestamp: new Date().toISOString(),
          })),
        );
      }),
    );
  }

  private isTechnicallyExecutable(asset: MlGuiAsset): boolean {
    const contentType = (asset.contentType || '').toLowerCase();
    const tags = (asset.keywords || []).map(tag => tag.toLowerCase());

    return contentType.includes('application/json') || tags.includes('inference') || tags.includes('endpoint');
  }

  private toExecutableAsset(asset: MlGuiAsset): ExecutableAsset {
    return {
      id: asset.id,
      name: asset.name,
      executionPath: this.extractInferencePath(asset),
      contentType: asset.contentType,
      tags: asset.keywords,
      isLocal: !!asset.isLocal,
    };
  }

  private extractInferencePath(asset: MlGuiAsset): string {
    const candidates = [
      'https://pionera.ai/edc/daimo#inference_path',
      'daimo:inference_path',
      'inference_path',
      'inferencePath',
      'path',
    ];

    const read = (record: Record<string, unknown>): string | null => {
      for (const key of candidates) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          return value.trim();
        }
      }
      return null;
    };

    const direct = read(asset.rawProperties || {});
    if (direct) {
      return direct.startsWith('/') ? direct : `/${direct}`;
    }

    const nested = read((asset.rawProperties?.['properties'] as Record<string, unknown>) || {});
    if (nested) {
      return nested.startsWith('/') ? nested : `/${nested}`;
    }

    return '/infer';
  }
}
