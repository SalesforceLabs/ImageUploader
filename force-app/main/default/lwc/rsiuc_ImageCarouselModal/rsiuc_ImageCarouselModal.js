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

import ImageCarouselModal_VideoError from '@salesforce/label/c.ImageCarouselModal_VideoError';
import ImageCarouselModal_AudioError from '@salesforce/label/c.ImageCarouselModal_AudioError';
import ImageCarouselModal_Close from '@salesforce/label/c.ImageCarouselModal_Close';

export default class Rsiuc_ImageCarouselModal extends LightningElement {
  label = {
    ImageCarouselModal_VideoError,
    ImageCarouselModal_AudioError,
    ImageCarouselModal_Close,
  };
  showModal = false;
  @api recordId;
  @api images = {};
  @api totalImages;
  @api offset;
  @api pageSize;
  @api sortField;
  @api order;
  @api keyword;
  @api communityId;
  @api communityBaseUrl;
  @api isMobile = false;
  @api acceptedFormatList = `jpg, jpeg, png, ppt, pptx, xls, xlsx, doc, docx, pdf`;
  error;
  swiper;
  initialSlide = 0;
  nextOffset;
  prevOffset;

  renderedCallback() {
    // invoke the method when component rendered or loaded
    Promise.all([
      loadStyle(this, swiperResource + '/SwiperJS/swiper-bundle.css'), // CSS File
      loadScript(this, swiperResource + '/SwiperJS/swiper-bundle.js'), // JS file
    ])
      .then(() => {
        // Call back function if scripts loaded successfully
        if (this.template.querySelector('.swiper-container')) {
          this.initSwiper(this.offset);
        }
      })
      .catch((error) => {
        showToast(this, 'Error', error.message, 'error');
      });
  }

  initSwiper(offset) {
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
      on: {
        transitionStart: () => {
          const audios = this.template.querySelectorAll('audio');
          const videos = this.template.querySelectorAll('video');
          audios.forEach((audio) => {
            audio.pause();
          });
          videos.forEach((video) => {
            video.pause();
          });
        },
      },
    });
    this.swiper.on('init', () => {
      this.getImagesList(offset, false, false);
    });

    this.swiper.init();
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
          let imageType = item.ContentDocument.FileType.toLowerCase() == 'pdf' && this.communityId && this.isMobile ? 'pdf-mobile' : null;
          let imageUrl = getPreviewUrlFromFileType(item.ContentDocument.FileType, item.ContentDocument.LatestPublishedVersionId, item.ContentDocumentId, this.communityBaseUrl, imageType);
          let htmlContent = this.generateDivSwiper(imageUrl, item.ContentDocument.Title, item.ContentDocument.FileType);
          if (isBegin && !isEnd) {
            prependArray.push(htmlContent);
          } else if (!isBegin && isEnd) {
            appendArray.push(htmlContent);
          } else if (!isBegin && !isEnd) {
            this.swiper.appendSlide(htmlContent);
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

        if (!isBegin && !isEnd) {
          this.swiper.slideTo(this.initialSlide, false, false);
          this.swiper.lazy.load();
          this.reachBeginningProcess();
        }
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
    let domStr = '';
    let contentTag = '';
    let imageTypeClass = 'image';

    if (/mov|mp4|avi|mpeg|wmv/i.test(fileType)) {
      imageTypeClass = 'video';
      contentTag = `
        <video controls muted buffered class="swiper-video" src="${imageUrl}">
         ${this.label.ImageCarouselModal_VideoError}
        </video>`;
    } else if (/mp3|aac|wav|wma/i.test(fileType)) {
      imageTypeClass = 'audio';
      contentTag = `
        <audio controls muted class="swiper-audio" src="${imageUrl}">
          ${this.label.ImageCarouselModal_AudioError}
         <code>audio</code>
        </audio>`;
    } else if (/pdf/i.test(fileType) && !(this.communityId && this.isMobile)) {
      imageTypeClass = 'pdf';
      contentTag = `<iframe src="${imageUrl}" class="swiper-pdf"></iframe>`;
    } else {
      contentTag = `<img c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" data-filetype="${fileType}" data-src="${imageUrl}" class="swiper-lazy" />`;
    }

    domStr = `
      <div c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" class="swiper-slide ${imageTypeClass}">
        <div class="image-block">
          <div class="image-block__inner">
            ${contentTag}
          </div>
        </div>
        <div c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" class="title">
          <div class="title-wrapper">${title}</div>
        </div>
        <div c-rsiuc_imagecarouselmodal_rsiuc_imagecarouselmodal="" class="swiper-lazy-preloader"></div>
      </div>`;

    return domStr;
  }

  @api
  openModal(imageIndex) {
    this.nextOffset = this.offset + this.pageSize;
    this.prevOffset = this.offset - this.pageSize;
    this.initialSlide = imageIndex;
    this.showModal = true;
  }

  @api
  closeModal() {
    this.showModal = false;
  }
}
