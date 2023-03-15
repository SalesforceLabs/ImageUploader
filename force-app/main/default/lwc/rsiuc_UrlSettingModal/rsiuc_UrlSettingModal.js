/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api, track, wire } from 'lwc';
import getAllUrlFieldOfObjectByRecordId from '@salesforce/apex/RSIUC_ImageUploadController.getAllUrlFieldOfObjectByRecordId';
import fillUrlItem from '@salesforce/apex/RSIUC_ImageUploadController.fillUrlItem';
import URLITEM_FIELD from '@salesforce/schema/ContentDocument.LatestPublishedVersion.URL_item__c';
import { reduceErrors } from 'c/rsiuc_Utils';
import { showToast } from 'c/rsiuc_Utils';

import UrlSettingModal_Close from '@salesforce/label/c.UrlSettingModal_Close';
import UrlSettingModal_UrlField from '@salesforce/label/c.UrlSettingModal_UrlField';
import UrlSettingModal_OptionAreaHelp from '@salesforce/label/c.UrlSettingModal_OptionAreaHelp';
import UrlSettingModal_CancelButton from '@salesforce/label/c.UrlSettingModal_CancelButton';
import UrlSettingModal_FinishButton from '@salesforce/label/c.UrlSettingModal_FinishButton';

export default class Rsiuc_UrlSettingModal extends LightningElement {
  showModal = false;
  isLoaded = false;
  error;
  URLITEM_FIELD = 'URL_item__c';
  label = {
    UrlSettingModal_Close,
    UrlSettingModal_UrlField,
    UrlSettingModal_OptionAreaHelp,
    UrlSettingModal_CancelButton,
    UrlSettingModal_FinishButton,
  };
  @api objectApiName;
  @api recordId;
  @api communityId;
  @api communityBaseUrl;
  @track image = {};
  @track options = [];
  layoutSettings = {
    imageBlock: 3,
    infoBlock: 9,
  };

  connectedCallback() {
    this.URLITEM_FIELD = String(URLITEM_FIELD.fieldApiName).split('.')[1];
  }

  @wire(getAllUrlFieldOfObjectByRecordId, { recordId: '$recordId' })
  wiredRecord({ error, data }) {
    if (error) {
      this.error = reduceErrors(error);
    } else if (data) {
      this.error = undefined;
      this.options = data;
    }
  }

  handleSaveClick() {
    this.isLoaded = true;
    if (this.image.ContentDocument.LatestPublishedVersion[this.URLITEM_FIELD] == this.image.newUrlItem && !this.image.newUrlItem) {
      this.isLoaded = false;
      this.closeModal();
      return;
    }
    fillUrlItem({
      recordId: this.recordId,
      versionId: this.image.ContentDocument.LatestPublishedVersionId,
      oldField: this.image.ContentDocument.LatestPublishedVersion[this.URLITEM_FIELD],
      newField: this.image.newUrlItem,
      communityUrl: this.communityBaseUrl,
    })
      .then((result) => {
        if (result) {
          this.closeModal();
          this.dispatchEvent(new CustomEvent('finish'));
        }
        this.error = undefined;
        this.isLoaded = false;
      })
      .catch((error) => {
        // this.error = reduceErrors(error);
        showToast(this, 'エラー', reduceErrors(error), 'error');
        this.isLoaded = false;
      });
  }

  handleChangeUrlItem(event) {
    this.image.newUrlItem = event.target.value;
  }

  handleImageError(event) {
    this.image.imageError = true;
  }

  @api
  openModal(image) {
    this.image = image;
    this.image.imageError = false;
    this.image.newUrlItem = image.ContentDocument.LatestPublishedVersion[this.URLITEM_FIELD];
    const changemodalEvent = new CustomEvent('changemodal', { detail: { state: 'open' } });
    this.dispatchEvent(changemodalEvent);

    const newOptions = [];
    for (const val of this.options) {
      newOptions.push({
        label: val.label,
        value: val.value,
        selected: val.value == image.ContentDocument.LatestPublishedVersion[this.URLITEM_FIELD],
      });
    }
    this.options = newOptions;
    this.showModal = true;
  }

  @api
  closeModal() {
    this.showModal = false;
    const changemodalEvent = new CustomEvent('changemodal', { detail: { state: 'close' } });
    this.dispatchEvent(changemodalEvent);
  }
}
