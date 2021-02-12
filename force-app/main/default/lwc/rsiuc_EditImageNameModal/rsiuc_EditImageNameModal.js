/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api, track, wire } from 'lwc';
import getImagesByContentDocumentIds from '@salesforce/apex/RSIUC_ImageUploadController.getImagesByContentDocumentIds';
import updateContentDocumentName from '@salesforce/apex/RSIUC_ImageUploadController.updateContentDocumentName';
import { generateInfoTextForImage, getPreviewUrlFromFileType, getDefaultIconFromFileType, formatBytes } from 'c/rsiuc_Utils';

export default class rsiuc_EditImageNameModal extends LightningElement {
  showModal = false;
  @track images = {};
  @api recordId;
  @api totalImages = 0;
  @api communityId;
  @api communityBaseUrl;
  imagesMap = {};
  isLoaded = false;
  layoutSettings = {
    imageBlock: 2,
    infoBlock: 10
  };

  //Executes on the page load
  connectedCallback() {}

  getImagesList(recordIds) {
    getImagesByContentDocumentIds({ contentIds: recordIds })
      .then((result) => {
        if (result) {
          result.forEach((item) => {
            item.imageUrl = getPreviewUrlFromFileType(item.FileType, item.LatestPublishedVersionId, item.Id, this.communityBaseUrl);
            item.infoText = generateInfoTextForImage(item.ContentSize, item.FileExtension);
            item.contentSize = formatBytes(item.ContentSize);
            item.fileExtension = item.FileExtension.toUpperCase();
            item.imageError = false;
            item.defaultIcon = getDefaultIconFromFileType(item.FileType);
            item.originalTitle = item.Title;
            this.imagesMap[item.Id] = item;
          });
          this.images.error = undefined;
          this.images.data = result;
          this.isLoaded = false;
        }
      })
      .catch((error) => {
        this.images.error = error;
        this.images.data = undefined;
        this.isLoaded = false;
      });
  }

  handleSaveClick() {
    let allValid = this.validateInput();
    if (!allValid) {
      alert('有効な値を入力してからもう一度試してください。');
      return;
    }

    this.isLoaded = true;
    let imageWrappers = [];
    for (const [key, value] of Object.entries(this.imagesMap)) {
      if (value.originalTitle != value.Title) {
        let wrap = {};
        wrap.Id = key;
        wrap.Title = value.Title;
        imageWrappers.push(wrap);
      }
    }

    if (imageWrappers.length == 0) {
      this.closeModal();
      return;
    }

    updateContentDocumentName({ contentDocs: imageWrappers })
      .then((result) => {
        if (result) {
          this.closeModal();
        }
        this.images.error = undefined;
        this.isLoaded = false;
      })
      .catch((error) => {
        this.images.error = error;
        this.isLoaded = false;
      });
  }

  handleImageError(event) {
    let contentId = event.target.dataset.contentid;
    this.images.data.every((item) => {
      if (item.Id == contentId) {
        item.imageError = true;
        return false;
      }
      return true;
    });
  }

  validateInput() {
    return [...this.template.querySelectorAll('lightning-input')].reduce((validSoFar, inputCmp) => {
      inputCmp.reportValidity();
      return validSoFar && inputCmp.checkValidity();
    }, true);
  }

  onInputChange(event) {
    this.imagesMap[event.target.name].Title = event.target.value;
  }

  @api
  openModal(recordIds) {
    this.showModal = true;
    this.isLoaded = true;
    this.getImagesList(recordIds);
  }

  @api
  closeModal() {
    this.showModal = false;
    this.images = {};
    this.imagesMap = {};
    this.dispatchEvent(new CustomEvent('finish'));
  }
}
