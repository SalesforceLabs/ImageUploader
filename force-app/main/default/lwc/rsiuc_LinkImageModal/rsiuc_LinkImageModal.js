/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api, track, wire } from 'lwc';
import getAllImagesInOrgWithKeyword from '@salesforce/apex/RSIUC_ImageUploadController.getAllImagesInOrgWithKeyword';
import totalAllImagesInOrgWithKeyword from '@salesforce/apex/RSIUC_ImageUploadController.totalAllImagesInOrgWithKeyword';
import linkImageToRecord from '@salesforce/apex/RSIUC_ImageUploadController.linkImageToRecord';
import getBase64Image from '@salesforce/apex/RSIUC_ImageUploadController.getBase64Image';
import { generateInfoTextForImage, getPreviewUrlFromFileType, getDefaultIconFromFileType, formatBytes } from 'c/rsiuc_Utils';

import LinkImageModal_Close from '@salesforce/label/c.LinkImageModal_Close';
import LinkImageModal_SelectFile from '@salesforce/label/c.LinkImageModal_SelectFile';
import LinkImageModal_InputSearchHelp from '@salesforce/label/c.LinkImageModal_InputSearchHelp';
import LinkImageModal_CancelButton from '@salesforce/label/c.LinkImageModal_CancelButton';
import LinkImageModal_FinishButton from '@salesforce/label/c.LinkImageModal_FinishButton';

export default class Rsiuc_LinkImageModal extends LightningElement {
  label = {
    LinkImageModal_Close,
    LinkImageModal_SelectFile,
    LinkImageModal_InputSearchHelp,
    LinkImageModal_CancelButton,
    LinkImageModal_FinishButton,
  };

  showModal = false;
  @api recordId;
  @api communityId;
  @api communityBaseUrl;
  @api acceptedFormatList = `jpg, jpeg, png, ppt, pptx, xls, xlsx, doc, docx, pdf`;
  @track images = {};
  totalImages = 0;
  offset = 0;
  @api pageSize;
  @api isMobile = false;
  isLoaded = false;
  imagesMap = {};
  layoutSettings = {
    checkBoxBlock: 1,
    imageBlock: 1,
    infoBlock: 10,
  };

  //Executes on the page load
  connectedCallback() {}

  calculateTotalImage(queryTerm) {
    totalAllImagesInOrgWithKeyword({ keyword: queryTerm, allowFileType: this.acceptedFormatList })
      .then((result) => {
        this.totalImages = result;
        this.images.error = undefined;
        this.isLoaded = false;
      })
      .catch((error) => {
        this.images.error = error;
        this.isLoaded = false;
      });
  }

  getImagesList(queryTerm) {
    getAllImagesInOrgWithKeyword({ recordId: this.recordId, keyword: queryTerm, offset: 0, pageSize: 50000, allowFileType: this.acceptedFormatList })
      .then((result) => {
        if (result) {
          result.forEach((item, idx) => {
            item.contentDocument.imageUrl = getPreviewUrlFromFileType(item.contentDocument.FileType, item.contentDocument.LatestPublishedVersionId, item.contentDocumentId, this.communityBaseUrl);
            item.contentDocument.infoText = generateInfoTextForImage(item.contentDocument.ContentSize, item.contentDocument.FileExtension);
            item.contentDocument.contentSize = formatBytes(item.contentDocument.ContentSize);
            item.contentDocument.fileExtension = item.contentDocument.FileExtension.toUpperCase();
            item.contentDocument.contentIdUrl = `/${item.contentDocument.Id}`;
            item.isBelongToRecordOriginal = item.isBelongToRecord;

            if (this.imagesMap[item.contentDocument.Id]) {
              item.isBelongToRecord = this.imagesMap[item.contentDocument.Id].isBelongToRecord;
              item.contentDocument.imageUrl = this.imagesMap[item.contentDocument.Id].contentDocument.imageUrl;
            } else {
              this.imagesMap[item.contentDocument.Id] = item;
            }

            item.contentDocument.imageError = false;
            item.contentDocument.defaultIcon = getDefaultIconFromFileType(item.contentDocument.FileType);
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

  previousHandler() {
    this.isLoaded = true;
    this.offset -= this.pageSize;

    if (this.offset === 0) {
      this.template.querySelector('c-rsiuc_-Paginator').changeView('disablePrevious');
    }

    this.template.querySelector('c-rsiuc_-Paginator').changeView('enableNext');
    this.getImagesList();
  }

  nextHandler() {
    this.isLoaded = true;
    this.offset += this.pageSize;

    if (this.offset + this.pageSize >= this.totalImages) {
      this.template.querySelector('c-rsiuc_-Paginator').changeView('disableNext');
    }

    this.template.querySelector('c-rsiuc_-Paginator').changeView('enablePrevious');
    this.getImagesList();
  }

  handleKeyUpInSearchBar(event) {
    const isEnterKey = event.keyCode === 13;
    const queryTerm = event.target.value;

    if (isEnterKey) {
      this.filterChange(queryTerm);
    }
  }

  filterChange(queryTerm) {
    this.isLoaded = true;
    this.offset = 0;
    this.calculateTotalImage(queryTerm);
    this.getImagesList(queryTerm);
  }

  handleSearchChangeValue(event) {
    const queryTerm = event.target.value;

    if ((!queryTerm && queryTerm.trim() === '') || this.isMobile) {
      this.filterChange(queryTerm);
    }
  }

  handleCheckButtonClick(event) {
    const contentLinkId = event.target.dataset.imageid;
    let isChecked = false;

    if (this.images.data) {
      this.images.data.forEach((item) => {
        if (item.contentDocument.Id == contentLinkId) {
          isChecked = !item.isBelongToRecord;
          item.isBelongToRecord = isChecked;
        }
      });
    }

    if (this.imagesMap[contentLinkId]) {
      this.imagesMap[contentLinkId].isBelongToRecord = isChecked;
    }
  }

  handleSaveClick() {
    this.isLoaded = true;
    let imageWrappers = [];

    for (const [key, value] of Object.entries(this.imagesMap)) {
      if (value.isBelongToRecordOriginal != value.isBelongToRecord) {
        let wrap = {};
        wrap.contentDocumentId = key;
        wrap.isBelongToRecord = value.isBelongToRecord;
        wrap.visibility = this.communityId ? 'AllUsers' : 'InternalUsers';
        imageWrappers.push(wrap);
      }
    }

    if (imageWrappers.length == 0) {
      this.closeModal();
      return;
    }

    linkImageToRecord({ recordId: this.recordId, imageUrlWrappers: imageWrappers })
      .then((result) => {
        if (result) {
          this.closeModal();
          this.dispatchEvent(new CustomEvent('finish'));
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
      if (item.contentDocument.Id == contentId) {
        if (item.contentDocument.FileType == 'JPG' || item.contentDocument.FileType == 'JPEG' || item.contentDocument.FileType == 'PNG') {
          getBase64Image({ contentVersionId: item.contentDocument.LatestPublishedVersionId })
            .then((result) => {
              if (result) {
                item.contentDocument.imageUrl = result;
              } else {
                item.contentDocument.imageError = true;
              }
            })
            .catch((error) => {
              console.log(error);
              item.contentDocument.imageError = true;
            });
        } else {
          item.contentDocument.imageError = true;
        }

        return false;
      }

      return true;
    });
  }

  @api
  openModal() {
    this.showModal = true;
    this.isLoaded = true;
    this.calculateTotalImage(null);
    this.getImagesList(null);
  }

  @api
  closeModal() {
    this.showModal = false;
    this.totalImages = 0;
    this.offset = 0;
    this.images = {};
    this.imagesMap = {};
  }
}
