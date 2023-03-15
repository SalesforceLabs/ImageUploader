/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api, track, wire } from 'lwc';
import getImagesRelatedToRecord from '@salesforce/apex/RSIUC_ImageUploadController.getImagesRelatedToRecord';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import swiperResource from '@salesforce/resourceUrl/RSIUC_ImageUpload';
import { showToast, getPreviewUrlFromFileType, getFileIconFromFileTypeAndStaticResource } from 'c/rsiuc_Utils';

export default class Rsiuc_ImageCarouselMobile extends LightningElement {
  @api recordId;
  @api totalImages;
  @api offset;
  @api pageSize;
  @api sortField;
  @api order;
  @api keyword;
  @api communityId;
  @api communityBaseUrl;
  @api initialSlide = 0;
  @api nameSpace = '';
  @api acceptedFormatList = `jpg, jpeg, png, ppt, pptx, xls, xlsx, doc, docx, pdf`;
  images = {};
  error;
  swiper;
  nextOffset;
  prevOffset;

  connectedCallback() {
    this.nextOffset = this.offset + this.pageSize;
    this.prevOffset = this.offset - this.pageSize;
    getImagesRelatedToRecord({ recordId: this.recordId, offset: this.offset, pageSize: this.pageSize, sortField: this.sortField, order: this.order, keyword: this.keyword, allowFileType: this.acceptedFormatList })
      .then((result) => {
        if (result) {
          result.forEach((item) => {
            item.imageUrl = getPreviewUrlFromFileType(item.ContentDocument.FileType, item.ContentDocument.LatestPublishedVersionId, item.ContentDocumentId, this.communityBaseUrl, 'ImageCarouselMobile');
          });
          this.images.error = undefined;
          this.images.data = result;
          this.error = undefined;
          if (this.template.querySelector('.swiper-container')) {
            this.initSwiper();
          }
        }
      })
      .catch((error) => {
        this.error = error;
      });
  }

  renderedCallback() {
    // invoke the method when component rendered or loaded
    Promise.all([
      loadStyle(this, swiperResource + '/SwiperJS/swiper-bundle.css'), // CSS File
      loadScript(this, swiperResource + '/SwiperJS/swiper-bundle.js'), // JS file
    ])
      .then(() => {
        // Call back function if scripts loaded successfully
      })
      .catch((error) => {
        showToast(this, 'Error', error.message, 'error');
      });
  }

  initSwiper() {
    if (this.swiper) {
      this.swiper.destroy();
    }
    this.swiper = new Swiper(this.template.querySelector('.swiper-container'), {
      init: false,
      lazy: {
        loadOnTransitionStart: true,
      },
      initialSlide: this.initialSlide,
      navigation: {
        nextEl: this.template.querySelector('.swiper-button-next'),
        prevEl: this.template.querySelector('.swiper-button-prev'),
      },
    });
    this.swiper.on('init', () => {
      for (let i = this.images.data.length - 1; i >= 0; i--) {
        this.swiper.addSlide(0, this.generateDivSwiper(this.images.data[i].imageUrl, this.images.data[i].ContentDocument.Title, this.images.data[i].ContentDocument.FileType));
      }
    });

    this.swiper.init();
    this.swiper.slideTo(this.initialSlide, false, false);
    this.swiper.lazy.load();
    if (this.swiper.isBeginning) {
      this.reachBeginningProcess();
    }
    if (this.swiper.isEnd) {
      this.reachEndProcess();
    }

    this.swiper.on('reachBeginning', () => {
      this.reachBeginningProcess();
    });
    this.swiper.on('reachEnd', () => {
      this.reachEndProcess();
    });

    this.bindErrorEventToImage();
  }

  reachBeginningProcess() {
    if (this.prevOffset >= 0) {
      this.getImagesList(this.prevOffset, true, false);
    }
  }

  reachEndProcess() {
    if (this.nextOffset < this.totalImages) {
      this.getImagesList(this.nextOffset, false, true);
    }
  }

  getImagesList(offset, isBegin, isEnd) {
    getImagesRelatedToRecord({ recordId: this.recordId, offset: offset, pageSize: this.pageSize, sortField: this.sortField, order: this.order, keyword: this.keyword, allowFileType: this.acceptedFormatList })
      .then((result) => {
        if (isBegin) {
          this.prevOffset -= this.pageSize;
        }
        if (isEnd) {
          this.nextOffset += this.pageSize;
        }
        let prependArray = [];
        let appendArray = [];
        result.forEach((item) => {
          let imageUrl = getPreviewUrlFromFileType(item.ContentDocument.FileType, item.ContentDocument.LatestPublishedVersionId, item.ContentDocumentId, this.communityBaseUrl, 'ImageCarouselMobile');
          let htmlContent = this.generateDivSwiper(imageUrl, item.ContentDocument.Title, item.ContentDocument.FileType);
          if (isBegin) {
            prependArray.push(htmlContent);
          }
          if (isEnd) {
            appendArray.push(htmlContent);
          }
        });

        //Detach event to prevent unwanted behaviour when DOM changed
        this.swiper.off('reachBeginning');
        this.swiper.off('reachEnd');

        //DOM changed
        this.swiper.prependSlide(prependArray.reverse());
        this.swiper.appendSlide(appendArray);

        //Attach event again
        this.swiper.on('reachBeginning', () => {
          this.reachBeginningProcess();
        });
        this.swiper.on('reachEnd', () => {
          this.reachEndProcess();
        });

        this.bindErrorEventToImage();

        this.error = undefined;
      })
      .catch((error) => {
        this.error = error;
      });
  }

  bindErrorEventToImage() {
    let imageNodes = this.template.querySelectorAll('.swiper-lazy');
    if (imageNodes) {
      imageNodes.forEach((item) => {
        item.addEventListener('error', this.handleImageLoadError);
      });
    }
  }

  handleImageLoadError(event) {
    event.target.src = getFileIconFromFileTypeAndStaticResource(event.target.dataset.filetype);
  }

  generateDivSwiper(imageUrl, title, fileType) {
    return `<div c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" class="swiper-slide">
      <div class="image-block">
        <img c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" data-filetype="${fileType}" data-src="${imageUrl}" class="swiper-lazy" />
      </div>
      <div c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" class="title">
        <div class="title-wrapper">${title}</div>
      </div>
      <div c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" class="swiper-lazy-preloader"></div>
    </div>`;
  }
}
