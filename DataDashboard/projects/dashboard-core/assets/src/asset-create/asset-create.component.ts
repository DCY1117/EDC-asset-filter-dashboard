/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import {
  Asset,
  AssetInput,
  BaseDataAddress,
  compact,
  DataAddress,
  EdcConnectorClientError,
  IdResponse,
} from '@think-it-labs/edc-connector-client';
import { NgClass } from '@angular/common';
import { AssetService } from '../asset.service';
import {
  AlertComponent,
  DataAddressFormComponent,
  DataTypeInputComponent,
  JsonObjectInputComponent,
  JsonObjectTableComponent,
} from '@eclipse-edc/dashboard-core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { JsonValue } from '@angular-devkit/core';

type MlMultiSelectControl = 'mlModality' | 'mlKeywords' | 'mlRuntime' | 'mlLanguages';

const DAIMO_METADATA_KEYS = {
  shortDescription: ['daimo:short_description', 'https://pionera.ai/edc/daimo#short_description'],
  version: ['daimo:model_version', 'https://pionera.ai/edc/daimo#model_version'],
  task: ['daimo:pipeline_tag', 'https://pionera.ai/edc/daimo#pipeline_tag'],
  modality: ['daimo:modality', 'https://pionera.ai/edc/daimo#modality'],
  keywords: ['daimo:tags', 'https://pionera.ai/edc/daimo#tags'],
  license: ['daimo:license', 'https://pionera.ai/edc/daimo#license'],
  maturityStatus: ['daimo:maturity_status', 'https://pionera.ai/edc/daimo#maturity_status'],
  runtime: ['daimo:library_name', 'https://pionera.ai/edc/daimo#library_name'],
  languages: ['daimo:language', 'https://pionera.ai/edc/daimo#language'],
  architecture: ['daimo:architecture_family', 'https://pionera.ai/edc/daimo#architecture_family'],
  baseModel: ['daimo:base_model', 'https://pionera.ai/edc/daimo#base_model'],
  format: ['daimo:format', 'https://pionera.ai/edc/daimo#format'],
  inferencePath: ['daimo:inference_path', 'https://pionera.ai/edc/daimo#inference_path'],
  parameterCount: ['daimo:parameter_count', 'https://pionera.ai/edc/daimo#parameter_count'],
  artifactSize: ['daimo:artifact_size_mb', 'https://pionera.ai/edc/daimo#artifact_size_mb'],
  quantization: ['daimo:quantization', 'https://pionera.ai/edc/daimo#quantization'],
  performanceMetric: ['daimo:performance_metric', 'https://pionera.ai/edc/daimo#performance_metric'],
  performanceDataset: [
    'daimo:performance_dataset',
    'https://pionera.ai/edc/daimo#performance_dataset',
    'daimo:datasets',
    'https://pionera.ai/edc/daimo#datasets',
  ],
  performanceReport: ['daimo:performance_report', 'https://pionera.ai/edc/daimo#performance_report'],
  intendedUse: ['daimo:intended_use', 'https://pionera.ai/edc/daimo#intended_use'],
  limitations: ['daimo:limitations', 'https://pionera.ai/edc/daimo#limitations'],
  piiSafe: ['daimo:pii_safe', 'https://pionera.ai/edc/daimo#pii_safe'],
  regulatedDomain: ['daimo:regulated_domain', 'https://pionera.ai/edc/daimo#regulated_domain'],
  humanInLoop: ['daimo:human_in_the_loop_required', 'https://pionera.ai/edc/daimo#human_in_the_loop_required'],
  latencyP95: ['daimo:latency_p95_ms', 'https://pionera.ai/edc/daimo#latency_p95_ms'],
  throughput: ['daimo:throughput_rps', 'https://pionera.ai/edc/daimo#throughput_rps'],
  rateLimits: ['daimo:rate_limits', 'https://pionera.ai/edc/daimo#rate_limits'],
  availabilityTier: ['daimo:availability_tier', 'https://pionera.ai/edc/daimo#availability_tier'],
} as const;

const DEFAULT_ML_TASK_OPTIONS = [
  'text-classification',
  'token-classification',
  'question-answering',
  'summarization',
  'translation',
  'text-generation',
  'chat-completion',
  'text-embedding',
  'feature-extraction',
  'information-retrieval',
  'reranking',
  'image-classification',
  'object-detection',
  'image-segmentation',
  'image-generation',
  'image-captioning',
  'ocr',
  'audio-classification',
  'automatic-speech-recognition',
  'text-to-speech',
  'speaker-diarization',
  'tabular-classification',
  'tabular-regression',
  'time-series-forecasting',
  'anomaly-detection',
  'recommendation',
];

const DEFAULT_ML_MODALITY_OPTIONS = ['tabular', 'text', 'image', 'audio', 'video', 'multimodal'];

const DEFAULT_ML_KEYWORD_OPTIONS = [
  'classification',
  'regression',
  'forecasting',
  'anomaly-detection',
  'inference',
  'embedding',
  'chat',
  'recommendation',
  'rag',
  'vision',
  'speech',
  'demo',
];

const DEFAULT_ML_RUNTIME_OPTIONS = [
  'transformers',
  'onnxruntime',
  'tensorflow',
  'pytorch',
  'xgboost',
  'scikit-learn',
  'lightgbm',
  'mlflow',
  'custom-python',
  'other',
];

const DEFAULT_ML_LANGUAGE_OPTIONS = ['en', 'es', 'de', 'fr', 'it', 'pt', 'zh', 'ja', 'ar', 'hi'];

const DEFAULT_ML_LICENSE_OPTIONS = [
  'Apache-2.0',
  'MIT',
  'BSD-3-Clause',
  'MPL-2.0',
  'GPL-3.0-only',
  'AGPL-3.0-only',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'Proprietary',
];

const DEFAULT_ML_MATURITY_OPTIONS = ['experimental', 'validated', 'production', 'deprecated'];

const DEFAULT_ML_FORMAT_OPTIONS = ['onnx', 'safetensors', 'pt', 'pth', 'tensorflow-savedmodel', 'pickle', 'joblib', 'json'];
const DEFAULT_ML_INFERENCE_PATH_OPTIONS = ['/infer', '/predict', '/score', '/classify', '/v1/predict'];
const DEFAULT_ML_QUANTIZATION_OPTIONS = ['none', 'fp16', 'int8', 'int4', 'gptq', 'awq'];

const DEFAULT_ML_DATASET_OPTIONS = [
  'iris',
  'housing',
  'mteb',
  'squad',
  'imagenet',
  'coco',
  'librispeech',
  'custom',
];

const DEFAULT_ML_METRIC_OPTIONS = [
  'accuracy',
  'f1',
  'precision',
  'recall',
  'roc-auc',
  'bleu',
  'rouge-l',
  'wer',
  'mae',
  'rmse',
  'latency',
  'custom',
];

const DEFAULT_ML_AVAILABILITY_OPTIONS = ['bronze', 'silver', 'gold', 'platinum', 'internal'];

@Component({
  selector: 'lib-asset-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    JsonObjectTableComponent,
    NgClass,
    DataTypeInputComponent,
    JsonObjectInputComponent,
    DataAddressFormComponent,
  ],
  templateUrl: './asset-create.component.html',
  styleUrl: './asset-create.component.css',
})
export class AssetCreateComponent implements OnChanges {
  private readonly assetService = inject(AssetService);
  private readonly formBuilder = inject(FormBuilder);

  @Input() asset?: Asset;
  @Output() created = new EventEmitter<IdResponse>();
  @Output() updated = new EventEmitter<void>();
  mode: 'create' | 'update' = 'create';

  errorMsg = '';

  properties: Record<string, JsonValue> = {};
  privateProperties: Record<string, JsonValue> = {};
  dataAddress?: DataAddress;

  mlTaskOptions = [...DEFAULT_ML_TASK_OPTIONS];
  mlModalityOptions = [...DEFAULT_ML_MODALITY_OPTIONS];
  mlKeywordOptions = [...DEFAULT_ML_KEYWORD_OPTIONS];
  mlRuntimeOptions = [...DEFAULT_ML_RUNTIME_OPTIONS];
  mlLanguageOptions = [...DEFAULT_ML_LANGUAGE_OPTIONS];
  mlLicenseOptions = [...DEFAULT_ML_LICENSE_OPTIONS];
  mlMaturityOptions = [...DEFAULT_ML_MATURITY_OPTIONS];
  mlFormatOptions = [...DEFAULT_ML_FORMAT_OPTIONS];
  mlInferencePathOptions = [...DEFAULT_ML_INFERENCE_PATH_OPTIONS];
  mlQuantizationOptions = [...DEFAULT_ML_QUANTIZATION_OPTIONS];
  mlDatasetOptions = [...DEFAULT_ML_DATASET_OPTIONS];
  mlMetricOptions = [...DEFAULT_ML_METRIC_OPTIONS];
  mlAvailabilityOptions = [...DEFAULT_ML_AVAILABILITY_OPTIONS];

  assetForm: FormGroup;

  constructor() {
    this.assetForm = this.formBuilder.group({
      id: [''],
      name: [''],
      contenttype: [''],
      mlEnabled: [false],
      mlDescription: [''],
      mlVersion: [''],
      mlTask: [''],
      mlModality: [[]],
      mlKeywords: [[]],
      mlLicense: [''],
      mlMaturity: [''],
      mlRuntime: [[]],
      mlLanguages: [[]],
      mlArchitecture: [''],
      mlBaseModel: [''],
      mlFormat: [''],
      mlInferencePath: [''],
      mlParameterCount: [''],
      mlArtifactSize: [''],
      mlQuantization: [''],
      mlPerformanceMetric: [''],
      mlPerformanceDataset: [''],
      mlPerformanceReport: [''],
      mlIntendedUse: [''],
      mlLimitations: [''],
      mlPiiSafe: [false],
      mlRegulatedDomain: [false],
      mlHumanInLoop: [false],
      mlLatencyP95: [''],
      mlThroughput: [''],
      mlRateLimits: [''],
      mlAvailabilityTier: [''],
    });
  }

  async ngOnChanges() {
    if (this.asset) {
      this.mode = 'update';
      await this.updateAssetAndSyncForm();
      this.assetForm.get('id')?.disable();
    }
  }

  toggleMultiValue(controlName: MlMultiSelectControl, value: string): void {
    const control = this.assetForm.get(controlName);
    if (!control) {
      return;
    }

    const currentValues = this.getMultiValues(controlName);
    const nextValues = currentValues.includes(value)
      ? currentValues.filter(current => current !== value)
      : [...currentValues, value];

    control.setValue(nextValues);
    control.markAsDirty();
  }

  isMultiValueSelected(controlName: MlMultiSelectControl, value: string): boolean {
    return this.getMultiValues(controlName).includes(value);
  }

  hasTextModalitySelected(): boolean {
    const modalities = this.getMultiValues('mlModality');
    return modalities.includes('text') || modalities.includes('multimodal');
  }

  private async updateAssetAndSyncForm() {
    this.properties = await compact(this.asset!.properties);
    this.privateProperties = await compact(this.asset!.privateProperties);
    this.dataAddress = (await compact(this.asset!.dataAddress)) as unknown as BaseDataAddress;

    const shortDescription = this.readFirstString(DAIMO_METADATA_KEYS.shortDescription);
    const version = this.readFirstString(DAIMO_METADATA_KEYS.version);
    const task = this.readFirstString(DAIMO_METADATA_KEYS.task);
    const modalities = this.readStringList(DAIMO_METADATA_KEYS.modality);
    const keywords = this.readStringList(DAIMO_METADATA_KEYS.keywords);
    const license = this.readFirstString(DAIMO_METADATA_KEYS.license);
    const maturity = this.readFirstString(DAIMO_METADATA_KEYS.maturityStatus);
    const runtime = this.readStringList(DAIMO_METADATA_KEYS.runtime);
    const languages = this.readStringList(DAIMO_METADATA_KEYS.languages);
    const architecture = this.readFirstString(DAIMO_METADATA_KEYS.architecture);
    const baseModel = this.readFirstString(DAIMO_METADATA_KEYS.baseModel);
    const format = this.readFirstString(DAIMO_METADATA_KEYS.format);
    const inferencePath = this.readFirstString(DAIMO_METADATA_KEYS.inferencePath);
    const parameterCount = this.readFirstString(DAIMO_METADATA_KEYS.parameterCount);
    const artifactSize = this.readFirstString(DAIMO_METADATA_KEYS.artifactSize);
    const quantization = this.readFirstString(DAIMO_METADATA_KEYS.quantization);
    const performanceMetric = this.readFirstString(DAIMO_METADATA_KEYS.performanceMetric);
    const performanceDataset = this.readFirstString(DAIMO_METADATA_KEYS.performanceDataset);
    const performanceReport = this.readFirstString(DAIMO_METADATA_KEYS.performanceReport);
    const intendedUse = this.readFirstString(DAIMO_METADATA_KEYS.intendedUse);
    const limitations = this.readFirstString(DAIMO_METADATA_KEYS.limitations);
    const piiSafe = this.readBoolean(DAIMO_METADATA_KEYS.piiSafe);
    const regulatedDomain = this.readBoolean(DAIMO_METADATA_KEYS.regulatedDomain);
    const humanInLoop = this.readBoolean(DAIMO_METADATA_KEYS.humanInLoop);
    const latencyP95 = this.readFirstString(DAIMO_METADATA_KEYS.latencyP95);
    const throughput = this.readFirstString(DAIMO_METADATA_KEYS.throughput);
    const rateLimits = this.readFirstString(DAIMO_METADATA_KEYS.rateLimits);
    const availabilityTier = this.readFirstString(DAIMO_METADATA_KEYS.availabilityTier);

    const hasMlMetadata =
      [
        shortDescription,
        version,
        task,
        license,
        maturity,
        architecture,
        baseModel,
        format,
        inferencePath,
        parameterCount,
        artifactSize,
        quantization,
        performanceMetric,
        performanceDataset,
        performanceReport,
        intendedUse,
        limitations,
        latencyP95,
        throughput,
        rateLimits,
        availabilityTier,
      ].some(value => !!value) ||
      modalities.length > 0 ||
      keywords.length > 0 ||
      runtime.length > 0 ||
      languages.length > 0 ||
      piiSafe ||
      regulatedDomain ||
      humanInLoop;

    this.ensureOption(this.mlTaskOptions, task);
    this.ensureOption(this.mlLicenseOptions, license);
    this.ensureOption(this.mlMaturityOptions, maturity);
    this.ensureOption(this.mlFormatOptions, format);
    this.ensureOption(this.mlInferencePathOptions, inferencePath);
    this.ensureOption(this.mlQuantizationOptions, quantization);
    this.ensureOption(this.mlMetricOptions, performanceMetric);
    this.ensureOption(this.mlDatasetOptions, performanceDataset);
    this.ensureOption(this.mlAvailabilityOptions, availabilityTier);

    this.ensureOptions(this.mlModalityOptions, modalities);
    this.ensureOptions(this.mlKeywordOptions, keywords);
    this.ensureOptions(this.mlRuntimeOptions, runtime);
    this.ensureOptions(this.mlLanguageOptions, languages);

    this.assetForm.get('id')?.setValue(this.asset!.id);
    this.assetForm.get('name')?.setValue(this.properties['name']);
    this.assetForm.get('contenttype')?.setValue(this.properties['contenttype']);
    this.assetForm.patchValue({
      mlEnabled: hasMlMetadata,
      mlDescription: shortDescription,
      mlVersion: version,
      mlTask: task,
      mlModality: modalities,
      mlKeywords: keywords,
      mlLicense: license,
      mlMaturity: maturity,
      mlRuntime: runtime,
      mlLanguages: languages,
      mlArchitecture: architecture,
      mlBaseModel: baseModel,
      mlFormat: format,
      mlInferencePath: inferencePath,
      mlParameterCount: parameterCount,
      mlArtifactSize: artifactSize,
      mlQuantization: quantization,
      mlPerformanceMetric: performanceMetric,
      mlPerformanceDataset: performanceDataset,
      mlPerformanceReport: performanceReport,
      mlIntendedUse: intendedUse,
      mlLimitations: limitations,
      mlPiiSafe: piiSafe,
      mlRegulatedDomain: regulatedDomain,
      mlHumanInLoop: humanInLoop,
      mlLatencyP95: latencyP95,
      mlThroughput: throughput,
      mlRateLimits: rateLimits,
      mlAvailabilityTier: availabilityTier,
    });
  }

  createAsset(): void {
    if (this.assetForm.valid) {
      const assetInput: AssetInput = this.createAssetInput();
      if (this.mode === 'create') {
        this.assetService
          .createAsset(assetInput)
          .then((idResponse: IdResponse) => {
            this.created.emit(idResponse);
          })
          .catch((err: EdcConnectorClientError) => {
            this.errorMsg = err.message;
          });
      } else if (this.mode === 'update') {
        this.assetService
          .updateAsset(assetInput)
          .then(() => this.updated.emit())
          .catch((err: EdcConnectorClientError) => (this.errorMsg = err.message));
      }
    } else {
      console.error('Create asset called with invalid form');
    }
  }

  private createAssetInput(): AssetInput {
    const properties = { ...this.properties };
    const privateProperties = { ...this.privateProperties };
    this.applyMlMetadata(properties);

    const asset: AssetInput = {
      dataAddress: this.dataAddress!,
      properties,
      privateProperties,
    };
    if (this.assetForm.value.id) {
      asset['@id'] = this.assetForm.value.id;
    }
    if (this.assetForm.value.name) {
      asset.properties['name'] = this.assetForm.value.name;
    }
    if (this.assetForm.value.contenttype) {
      asset.properties['contenttype'] = this.assetForm.value.contenttype;
    }
    return asset;
  }

  private applyMlMetadata(properties: Record<string, JsonValue>): void {
    this.clearMlMetadata(properties);

    if (!this.assetForm.value.mlEnabled) {
      return;
    }

    const shortDescription = this.asTrimmedString(this.assetForm.value.mlDescription);
    const version = this.asTrimmedString(this.assetForm.value.mlVersion);
    const task = this.asTrimmedString(this.assetForm.value.mlTask);
    const modalities = this.asStringArray(this.assetForm.value.mlModality);
    const keywords = this.asStringArray(this.assetForm.value.mlKeywords);
    const license = this.asTrimmedString(this.assetForm.value.mlLicense);
    const maturity = this.asTrimmedString(this.assetForm.value.mlMaturity);
    const runtime = this.asStringArray(this.assetForm.value.mlRuntime);
    const languages = this.asStringArray(this.assetForm.value.mlLanguages);
    const architecture = this.asTrimmedString(this.assetForm.value.mlArchitecture);
    const baseModel = this.asTrimmedString(this.assetForm.value.mlBaseModel);
    const format = this.asTrimmedString(this.assetForm.value.mlFormat);
    const inferencePath = this.asTrimmedString(this.assetForm.value.mlInferencePath);
    const parameterCount = this.asTrimmedString(this.assetForm.value.mlParameterCount);
    const artifactSize = this.asTrimmedString(this.assetForm.value.mlArtifactSize);
    const quantization = this.asTrimmedString(this.assetForm.value.mlQuantization);
    const performanceMetric = this.asTrimmedString(this.assetForm.value.mlPerformanceMetric);
    const performanceDataset = this.asTrimmedString(this.assetForm.value.mlPerformanceDataset);
    const performanceReport = this.asTrimmedString(this.assetForm.value.mlPerformanceReport);
    const intendedUse = this.asTrimmedString(this.assetForm.value.mlIntendedUse);
    const limitations = this.asTrimmedString(this.assetForm.value.mlLimitations);
    const latencyP95 = this.asTrimmedString(this.assetForm.value.mlLatencyP95);
    const throughput = this.asTrimmedString(this.assetForm.value.mlThroughput);
    const rateLimits = this.asTrimmedString(this.assetForm.value.mlRateLimits);
    const availabilityTier = this.asTrimmedString(this.assetForm.value.mlAvailabilityTier);

    if (shortDescription) {
      properties['daimo:short_description'] = shortDescription;
    }
    if (version) {
      properties['daimo:model_version'] = version;
    }
    if (task) {
      properties['daimo:pipeline_tag'] = task;
    }
    if (modalities.length > 0) {
      properties['daimo:modality'] = modalities;
    }
    if (keywords.length > 0) {
      properties['daimo:tags'] = keywords;
    }
    if (license) {
      properties['daimo:license'] = license;
    }
    if (maturity) {
      properties['daimo:maturity_status'] = maturity;
    }
    if (runtime.length > 0) {
      properties['daimo:library_name'] = runtime;
    }
    if (languages.length > 0) {
      properties['daimo:language'] = languages;
    }
    if (architecture) {
      properties['daimo:architecture_family'] = architecture;
    }
    if (baseModel) {
      properties['daimo:base_model'] = baseModel;
    }
    if (format) {
      properties['daimo:format'] = format;
    }
    if (inferencePath) {
      properties['daimo:inference_path'] = inferencePath;
    }
    if (parameterCount) {
      properties['daimo:parameter_count'] = parameterCount;
    }
    if (artifactSize) {
      properties['daimo:artifact_size_mb'] = artifactSize;
    }
    if (quantization) {
      properties['daimo:quantization'] = quantization;
    }
    if (performanceMetric) {
      properties['daimo:performance_metric'] = performanceMetric;
    }
    if (performanceDataset) {
      properties['daimo:performance_dataset'] = performanceDataset;
      properties['daimo:datasets'] = [performanceDataset];
    }
    if (performanceReport) {
      properties['daimo:performance_report'] = performanceReport;
    }
    if (intendedUse) {
      properties['daimo:intended_use'] = intendedUse;
    }
    if (limitations) {
      properties['daimo:limitations'] = limitations;
    }
    if (this.assetForm.value.mlPiiSafe) {
      properties['daimo:pii_safe'] = true;
    }
    if (this.assetForm.value.mlRegulatedDomain) {
      properties['daimo:regulated_domain'] = true;
    }
    if (this.assetForm.value.mlHumanInLoop) {
      properties['daimo:human_in_the_loop_required'] = true;
    }
    if (latencyP95) {
      properties['daimo:latency_p95_ms'] = latencyP95;
    }
    if (throughput) {
      properties['daimo:throughput_rps'] = throughput;
    }
    if (rateLimits) {
      properties['daimo:rate_limits'] = rateLimits;
    }
    if (availabilityTier) {
      properties['daimo:availability_tier'] = availabilityTier;
    }
  }

  private clearMlMetadata(properties: Record<string, JsonValue>): void {
    Object.values(DAIMO_METADATA_KEYS)
      .flat()
      .forEach(key => {
        delete properties[key];
      });
  }

  private readFirstString(keys: readonly string[]): string {
    return this.readStringList(keys)[0] || '';
  }

  private readStringList(keys: readonly string[]): string[] {
    const values = keys.flatMap(key => this.extractStrings(this.properties[key]));
    return this.uniqueStrings(values);
  }

  private readBoolean(keys: readonly string[]): boolean {
    for (const key of keys) {
      const value = this.extractScalar(this.properties[key]);
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') {
          return true;
        }
        if (normalized === 'false') {
          return false;
        }
      }
    }
    return false;
  }

  private ensureOption(options: string[], value: string): void {
    if (!value || options.includes(value)) {
      return;
    }
    options.push(value);
    options.sort((a, b) => a.localeCompare(b));
  }

  private ensureOptions(options: string[], values: string[]): void {
    values.forEach(value => this.ensureOption(options, value));
  }

  private getMultiValues(controlName: MlMultiSelectControl): string[] {
    return this.asStringArray(this.assetForm.get(controlName)?.value);
  }

  private extractScalar(value: unknown): unknown {
    if (Array.isArray(value)) {
      return this.extractScalar(value[0]);
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record['@value'] !== undefined) {
        return record['@value'];
      }
    }
    return value;
  }

  private extractStrings(value: unknown): string[] {
    if (value == null) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.flatMap(item => this.extractStrings(item));
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized ? [normalized] : [];
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return [String(value)];
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record['@value'] !== undefined) {
        return this.extractStrings(record['@value']);
      }
      return [];
    }
    return [];
  }

  private asTrimmedString(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim();
  }

  private asStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return this.uniqueStrings(value.map(item => this.asTrimmedString(item)).filter(item => !!item));
    }

    const normalized = this.asTrimmedString(value);
    return normalized ? [normalized] : [];
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const uniqueValues: string[] = [];

    values.forEach(value => {
      if (!seen.has(value)) {
        seen.add(value);
        uniqueValues.push(value);
      }
    });

    return uniqueValues;
  }
}
