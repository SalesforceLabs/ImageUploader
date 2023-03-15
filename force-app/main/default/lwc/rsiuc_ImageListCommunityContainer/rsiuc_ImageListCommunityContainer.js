/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api } from 'lwc';
import Id from '@salesforce/community/Id';
import BasePath from '@salesforce/community/basePath';

export default class Rsiuc_ImageListCommunityContainer extends LightningElement {
  @api recordId;
  @api communityId = Id;
  @api communityBaseUrl = BasePath;
  @api appName = 'Image Uploader';
  @api pageSize = '10';
  @api sortFieldApi = 'LastModifiedDate';
  @api defaultSort = 'Descending order';
  @api targetUrlField = 'None';
  @api selectedSvgIconType = 'Small';
  @api isHideUpload = false;
  @api isHideSearchArea = false;
  @api isHideFileEdit = false;
  @api isHideUrlItem = false;
  @api isHideEditNameModal = false;
  @api isHideShareButton = false;
  @api isHideDelete = false;
  @api acceptedFormatList = `jpg, jpeg, png, ppt, pptx, xls, xlsx, doc, docx, pdf`;
}
