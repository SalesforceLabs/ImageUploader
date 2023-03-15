/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LOGO_ICON from '@salesforce/resourceUrl/RSIUC_ImageUpload';
import UnknownError from '@salesforce/label/c.UnknownError';
/**
 * Format bytes to string like 1MB, 560KB
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Show toast notification
 */
export function showToast(cmp, title, message, variant) {
  const event = new ShowToastEvent({
    title: title,
    message: message,
    variant: variant,
  });
  cmp.dispatchEvent(event);
}

/**
 * Generate direct image url of content version from content version id
 */
export function generateImageUrlFromContentVersion(contentVersionId, communityBaseUrl, sizeType = 'original') {
  const baseUrl = communityBaseUrl ? communityBaseUrl.replace(/\/s$/i, '') : '';

  switch (sizeType) {
    case '120':
      return `${baseUrl}/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB120BY90&versionId=${contentVersionId}`;
    case '240':
      return `${baseUrl}/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB240BY180&versionId=${contentVersionId}`;
    case '720':
      return `${baseUrl}/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB720BY480&versionId=${contentVersionId}`;
    case 'svg':
      return `${baseUrl}/sfc/servlet.shepherd/version/renditionDownload?rendition=SVGZ&versionId=${contentVersionId}`;
    case 'original':
      return `${baseUrl}/sfc/servlet.shepherd/version/download/${contentVersionId}`;
    case 'video':
    case 'audio':
    case 'pdf':
      return `${baseUrl}/sfc/servlet.shepherd/document/download/${contentVersionId}`;
    default:
      return `${baseUrl}/sfc/servlet.shepherd/version/download/${contentVersionId}`;
  }
}

/**
 * Generate error string from error array or error body
 */
export function reduceErrors(error) {
  if (Array.isArray(error.body)) {
    return error.body.map((e) => e.message).join(', ');
  } else if (typeof error.body.message === 'string') {
    return error.body.message;
  }
  return UnknownError;
}

/**
 * return default icon based on file type, used in lightning-icon component
 */
export function getDefaultIconFromFileType(fileType) {
  switch (fileType) {
    case 'POWER_POINT':
    case 'POWER_POINT_X':
      return 'doctype:ppt';
    case 'EXCEL':
    case 'EXCEL_X':
      return 'doctype:excel';
    case 'JPG':
    case 'JPEG':
    case 'PNG':
      return 'doctype:image';
    case 'WORD':
    case 'WORD_X':
      return 'doctype:word';
    case 'PDF':
      return 'doctype:pdf';
    default:
      return 'doctype:unknown';
  }
}

/**
 * return preview image url based on file type
 */
export function getPreviewUrlFromFileType(fileType, contentVersionId, contentId, communityBaseUrl, from) {
  if (from) {
    return generateImageUrlFromContentVersion(contentVersionId, communityBaseUrl, '720');
  }

  switch (fileType) {
    case 'POWER_POINT':
    case 'POWER_POINT_X':
    case 'EXCEL':
    case 'EXCEL_X':
    case 'WORD':
    case 'WORD_X':
      return generateImageUrlFromContentVersion(contentVersionId, communityBaseUrl, '720');
    case 'PDF':
      return generateImageUrlFromContentVersion(contentId, communityBaseUrl, 'pdf');
    case 'AVI':
    case 'MPEG':
    case 'WMV':
    case 'MP4':
    case 'MOV':
      return generateImageUrlFromContentVersion(contentId, communityBaseUrl, 'video');
    case 'WMA':
    case 'WAV':
    case 'ACC':
    case 'MP3':
      return generateImageUrlFromContentVersion(contentId, communityBaseUrl, 'audio');
    default:
      return generateImageUrlFromContentVersion(contentVersionId, communityBaseUrl);
  }
}

/**
 * return icon url based on file type and static resource
 */
export function getFileIconFromFileTypeAndStaticResource(fileType) {
  let srcUrl = `${LOGO_ICON}/doctypeIcon/`;
  switch (fileType) {
    case 'POWER_POINT':
    case 'POWER_POINT_X':
      srcUrl += 'ppt_120.png';
      break;
    case 'EXCEL':
    case 'EXCEL_X':
      srcUrl += 'excel_120.png';
      break;
    case 'WORD':
    case 'WORD_X':
      srcUrl += 'word_120.png';
      break;
    case 'PDF':
      srcUrl += 'pdf_120.png';
      break;
    default:
      srcUrl += 'unknown_120.png';
  }
  return srcUrl;
}

/**
 * generate info text of image from file size and file extension
 */
export function generateInfoTextForImage(contentSize, fileExtension) {
  return `${formatBytes(contentSize)} / ${fileExtension.toUpperCase()}`;
}
