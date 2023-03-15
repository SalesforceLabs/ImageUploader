/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api, track, wire } from 'lwc';
import getImagesRelatedToRecord from '@salesforce/apex/RSIUC_ImageUploadController.getImagesRelatedToRecord';
import totalImagesBelongToRecord from '@salesforce/apex/RSIUC_ImageUploadController.totalImagesBelongToRecord';
import deleteImageFromRecord from '@salesforce/apex/RSIUC_ImageUploadController.deleteImageFromRecord';
import getAllUrlFieldOfObjectByRecordId from '@salesforce/apex/RSIUC_ImageUploadController.getAllUrlFieldOfObjectByRecordId';
import fillUrlItem from '@salesforce/apex/RSIUC_ImageUploadController.fillUrlItem';
import getNameSpace from '@salesforce/apex/RSIUC_ImageUploadController.getNameSpace';
import getImagesByContentDocumentIds from '@salesforce/apex/RSIUC_ImageUploadController.getImagesByContentDocumentIds';
import linkImageToRecord from '@salesforce/apex/RSIUC_ImageUploadController.linkImageToRecord';
import formFactorPropertyName from '@salesforce/client/formFactor';
import { generateInfoTextForImage, showToast, getPreviewUrlFromFileType, getDefaultIconFromFileType, formatBytes } from 'c/rsiuc_Utils';
import { updateRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import CONTENTDOCUMENT_OBJECT from '@salesforce/schema/ContentDocument';
import URLITEM_FIELD from '@salesforce/schema/ContentDocument.LatestPublishedVersion.URL_item__c';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

import RSIUC_ImageUploadResource from '@salesforce/resourceUrl/RSIUC_ImageUpload';

import ImageListContainer_List from '@salesforce/label/c.ImageListContainer_List';
import ImageListContainer_Column from '@salesforce/label/c.ImageListContainer_Column';
import ImageListContainer_ConfirmText from '@salesforce/label/c.ImageListContainer_ConfirmText';
import ImageListContainer_DeleteSuccess from '@salesforce/label/c.ImageListContainer_DeleteSuccess';
import ImageListContainer_DeleteSuccessText from '@salesforce/label/c.ImageListContainer_DeleteSuccessText';
import ImageListContainer_DeleteFailed from '@salesforce/label/c.ImageListContainer_DeleteFailed';
import ImageListContainer_FileAdded from '@salesforce/label/c.ImageListContainer_FileAdded';
import ImageListContainer_ChooseFile from '@salesforce/label/c.ImageListContainer_ChooseFile';
import ImageListContainer_ListView from '@salesforce/label/c.ImageListContainer_ListView';
import ImageListContainer_LargeAlt from '@salesforce/label/c.ImageListContainer_LargeAlt';
import ImageListContainer_ListAlt from '@salesforce/label/c.ImageListContainer_ListAlt';
import ImageListContainer_FileUpload from '@salesforce/label/c.ImageListContainer_FileUpload';
import ImageListContainer_TitleSearch from '@salesforce/label/c.ImageListContainer_TitleSearch';
import ImageListContainer_SortBy from '@salesforce/label/c.ImageListContainer_SortBy';
import ImageListContainer_SortOrder from '@salesforce/label/c.ImageListContainer_SortOrder';
import ImageListContainer_Reload from '@salesforce/label/c.ImageListContainer_Reload';
import ImageListContainer_Download from '@salesforce/label/c.ImageListContainer_Download';
import ImageListContainer_FieldSetting from '@salesforce/label/c.ImageListContainer_FieldSetting';
import ImageListContainer_Delete from '@salesforce/label/c.ImageListContainer_Delete';
import ImageListContainer_ShareSetting from '@salesforce/label/c.ImageListContainer_ShareSetting';
import ImageListContainer_External from '@salesforce/label/c.ImageListContainer_External';
import ImageListContainer_Internal from '@salesforce/label/c.ImageListContainer_Internal';

export default class Rsiuc_ImageListContainer extends NavigationMixin(LightningElement) {
  label = {
    ImageListContainer_List,
    ImageListContainer_Column,
    ImageListContainer_ConfirmText,
    ImageListContainer_DeleteSuccess,
    ImageListContainer_DeleteSuccessText,
    ImageListContainer_DeleteFailed,
    ImageListContainer_FileAdded,
    ImageListContainer_ChooseFile,
    ImageListContainer_ListView,
    ImageListContainer_LargeAlt,
    ImageListContainer_ListAlt,
    ImageListContainer_FileUpload,
    ImageListContainer_TitleSearch,
    ImageListContainer_SortBy,
    ImageListContainer_SortOrder,
    ImageListContainer_Reload,
    ImageListContainer_Download,
    ImageListContainer_FieldSetting,
    ImageListContainer_Delete,
    ImageListContainer_ShareSetting,
    ImageListContainer_External,
    ImageListContainer_Internal,
  };
  URLITEM_FIELD = 'URL_item__c';
  nameSpace = '';
  @api recordId;
  @api communityId;
  @api communityBaseUrl;
  @api appName = 'Image Uploader';
  @api pageSize = 10;
  @api objectApiName;
  @api sortFieldApi = 'LastModifiedDate'; //並び替えで使用する項目名
  @api defaultSort = 'Descending order'; // or Ascending order
  @api targetUrlField = 'None';
  @api isHideUpload = false;
  @api isHideFileEdit = false;
  @api isHideDelete = false;
  @api isHideShareButton = false;
  @api isHideSearchArea = false;
  @track images = {};
  @api isHideUrlItem = false;
  @api totalImages = 0;
  offset = 0;
  @api isHideEditNameModal = false;
  isHideActionsArea = false;
  isLoaded = false;
  @api acceptedFormatList = `jpg, jpeg, png, ppt, pptx, xls, xlsx, doc, docx, pdf`;
  @api disableIamgeDownload = false;
  acceptedFormats = [];
  isMobile = false;
  iconInfo = {
    List: {
      label: this.label.ImageListContainer_List,
      url: `${RSIUC_ImageUploadResource}/svg/ImageUploadIcon-List.svg#ImageUpload-List`,
    },
    Image: {
      label: this.label.ImageListContainer_Column,
      url: `${RSIUC_ImageUploadResource}/svg/ImageUploadIcon-Only.svg#ImageUpload-Only`,
    },
  };
  @api selectedSvgIconType;
  @api selectedSvgIconUrl;
  @api listTypeClassName;
  listSvgIconUrl;
  imageSvgIconUrl;
  @track _dropdownVisible = false;
  @track _dropdownOpened = false;
  @api pickListValue = [];
  @api orderValue = [];
  @api searchKeyword = '';
  @track containerClass = 'card-container';
  urlField = {};
  isCommunity;

  @wire(getObjectInfo, { objectApiName: CONTENTDOCUMENT_OBJECT })
  contentDocumentInfo({ error, data }) {
    if (data) {
      const newOptions = [];

      for (const [key, value] of Object.entries(data.fields)) {
        let feild = value;
        const checkFilter = ['LastModifiedDate', 'OwnerId', 'Title', 'FileExtension'];

        if (checkFilter.includes(feild.apiName)) {
          newOptions.push({ label: feild.label, value: feild.apiName, selected: feild.apiName == this.sortFieldApi });
        }
      }

      this.pickListValue = newOptions;
    }
  }

  //Executes on the page load
  connectedCallback() {
    const _selectedSvgIconType = this.selectedSvgIconType == 'Small' ? 'List' : 'Image';
    const _acceptedFormatList = [];
    if (this.acceptedFormatList && this.acceptedFormatList.length > 0) {
      this.acceptedFormatList.split(',').forEach((item) => {
        _acceptedFormatList.push(`.${item.trim()}`);
      });
    }
    this.acceptedFormats = _acceptedFormatList;
    this.defaultSort = 'Descending order' == this.defaultSort ? 'DESC' : 'ASC';
    this.isCommunity = this.communityId && this.communityBaseUrl;
    this.isHideShareButton = this.isHideShareButton || this.isCommunity;
    this.isHideActionsArea = this.isHideUrlItem && this.isHideDelete && this.isHideShareButton;
    this.orderValue = [
      { label: 'Ascending order', value: 'ASC', selected: 'ASC' == this.defaultSort },
      { label: 'Descending order', value: 'DESC', selected: 'DESC' == this.defaultSort },
    ];
    this.selectedSvgIconUrl = this.iconInfo[_selectedSvgIconType].url;
    this.listTypeClassName = `listType-${_selectedSvgIconType}`;
    this.listSvgIconUrl = this.iconInfo.List.url;
    this.imageSvgIconUrl = this.iconInfo.Image.url;
    this.isMobile = formFactorPropertyName === 'Small';
    this.disableIamgeDownload = this.disableIamgeDownload || this.isMobile;
    this.URLITEM_FIELD = String(URLITEM_FIELD.fieldApiName).split('.')[1];
    this.getAllFeilds();
  }

  getAllFeilds() {
    getNameSpace().then((result) => {
      if (result) {
        this.nameSpace = result;
      }
    });
    getAllUrlFieldOfObjectByRecordId({ recordId: this.recordId }).then((result) => {
      this.urlField['original'] = result;

      result.forEach((item) => {
        this.urlField[item.value] = item.label;
      });

      this.calculateTotalImage();
      this.getImagesList();
    });
  }

  getUrlFieldLabel(apiName) {
    let label;

    if (this.urlField && this.urlField[apiName]) {
      label = this.urlField[apiName];
    }

    return label;
  }

  calculateTotalImage() {
    totalImagesBelongToRecord({ recordId: this.recordId, keyword: this.searchKeyword, allowFileType: this.acceptedFormatList })
      .then((result) => {
        this.totalImages = result;

        if (this.pageSize <= this.offset) {
          this.template.querySelector('c-rsiuc_-Paginator').changeView('enablePrevious');
        } else {
          this.template.querySelector('c-rsiuc_-Paginator').changeView('disablePrevious');
        }

        if (this.totalImages > this.offset + this.pageSize) {
          this.template.querySelector('c-rsiuc_-Paginator').changeView('enableNext');
        } else {
          this.template.querySelector('c-rsiuc_-Paginator').changeView('disableNext');
        }

        this.images.error = undefined;
        this.isLoaded = false;
      })
      .catch((error) => {
        this.images.error = error;
        this.isLoaded = false;
      });
  }

  getImagesList() {
    getImagesRelatedToRecord({ recordId: this.recordId, offset: this.offset, pageSize: this.pageSize, sortField: this.sortFieldApi, order: this.defaultSort, keyword: this.searchKeyword, allowFileType: this.acceptedFormatList })
      .then((result) => {
        if (result) {
          const baseUrl = this.communityBaseUrl ? this.communityBaseUrl.replace(/\/s$/i, '') : '';

          result.forEach((item) => {
            item.imageUrl = getPreviewUrlFromFileType(item.ContentDocument.FileType, item.ContentDocument.LatestPublishedVersionId, item.ContentDocumentId, this.communityBaseUrl, 'ImageListConteiner');
            item.infoText = generateInfoTextForImage(item.ContentDocument.ContentSize, item.ContentDocument.FileExtension);
            item.contentSize = formatBytes(item.ContentDocument.ContentSize);
            item.fileExtension = item.ContentDocument.FileExtension.toUpperCase();
            item.urlItem = item.ContentDocument.LatestPublishedVersion[this.URLITEM_FIELD];
            item.urlItemLabel = this.getUrlFieldLabel(item.ContentDocument.LatestPublishedVersion[this.URLITEM_FIELD]);
            item.hasUrlItem = !this.isHideUrlItem && item.urlItem && item.urlItem != '';
            item.contentIdUrl = `${baseUrl}/${item.ContentDocumentId}`;
            item.downloadUrl = `${baseUrl}/sfc/servlet.shepherd/document/download/${item.ContentDocumentId}`;
            item.imageError = false;
            item.isAllUsers = item.Visibility === 'AllUsers';
            item.defaultIcon = getDefaultIconFromFileType(item.ContentDocument.FileType);
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

  handleDeleteClick(event) {
    let recId = event.target.dataset.id;

    if (confirm(this.label.ImageListContainer_ConfirmText)) {
      this.isLoaded = true;
      deleteImageFromRecord({ contentLinkId: recId })
        .then((result) => {
          let deleteResult = JSON.parse(result);
          if (deleteResult.success) {
            showToast(this, this.label.ImageListContainer_DeleteSuccess, this.label.ImageListContainer_DeleteSuccessText, 'success');

            this.offset = 0;
            this.calculateTotalImage();
            this.getImagesList();
          } else {
            for (let i = 0; i < deleteResult.errors.length; i++) {
              showToast(this, this.label.ImageListContainer_DeleteFailed, deleteResult.errors[i].message, 'error');
            }
          }
          this.images.error = undefined;
          this.isLoaded = false;
        })
        .catch((error) => {
          this.isLoaded = false;
          showToast(this, this.label.ImageListContainer_DeleteFailed, error.body.message, 'error');
        });
    }
  }

  handleLinkImageClick() {
    if (this.isMobile && !this.isCommunity) {
      const componentName = this.nameSpace != '' ? `${this.nameSpace}RSIUC_NavigateToLWC` : 'c__RSIUC_NavigateToLWC';

      this[NavigationMixin.Navigate]({
        type: 'standard__component',
        attributes: {
          componentName: componentName,
        },
        state: {
          c__recordId: this.recordId,
          c__pageSize: this.pageSize,
          c__pageType: 'linkimage',
          c__nameSpace: this.nameSpace,
          c__acceptedFormatList: this.acceptedFormatList,
        },
      });
    } else {
      this.template.querySelector('c-rsiuc_-Link-Image-Modal').openModal();
    }
  }

  openEditImageNameProcess(contentIds) {
    this.isLoaded = false;

    if (this.isMobile && !this.isCommunity) {
      const componentName = this.nameSpace != '' ? `${this.nameSpace}RSIUC_NavigateToLWC` : 'c__RSIUC_NavigateToLWC';

      this[NavigationMixin.Navigate]({
        type: 'standard__component',
        attributes: {
          componentName: componentName,
        },
        state: {
          c__recordId: this.recordId,
          c__contentIds: contentIds.toString(),
          c__pageType: 'editname',
          c__nameSpace: this.nameSpace,
          c__acceptedFormatList: this.acceptedFormatList,
        },
      });
    } else {
      this.template.querySelector('c-rsiuc_-Edit-Image-Name-Modal').openModal(contentIds);
    }
  }

  finishLinkHandler() {
    this.isLoaded = true;
    this.offset = 0;
    this.calculateTotalImage();
    this.getImagesList();
  }

  handleUploadFinished(event) {
    const files = event.detail.files || [];
    showToast(this, '', this.label.ImageListContainer_FileAdded, 'success');
    this.isLoaded = true;
    this.offset = 0;

    // 関連ファイルがなく、アップロードされたファイルが1つだけの場合、指定した項目に自動的に登録する
    if (files.length === 1 && this.totalImages === 0 && this.targetUrlField && !/None|なし/i.test(this.targetUrlField)) {
      const targetItemId = files[0].documentId;

      getImagesByContentDocumentIds({ contentIds: targetItemId }).then((getImagesByContentDocumentIdsResult) => {
        if (getImagesByContentDocumentIdsResult) {
          getImagesByContentDocumentIdsResult.forEach((item) => {
            fillUrlItem({ recordId: this.recordId, versionId: item.LatestPublishedVersionId, oldField: null, newField: this.targetUrlField, communityUrl: this.communityBaseUrl })
              .then((fillUrlItemResult) => {
                if (fillUrlItemResult) {
                  updateRecord({ fields: { Id: this.recordId } });
                  this.startOpenEditImageNameProcess(files);
                } else {
                  //true以外の返却は存在しない
                }
              })
              .catch((error) => {
                // this.error = reduceErrors(error);
                showToast(this, 'Error', reduceErrors(error), 'error');
                this.isLoaded = false;
              });
          });
        }
      });
    } else {
      this.startOpenEditImageNameProcess(files);
    }
  }

  startOpenEditImageNameProcess(files) {
    if (!this.isHideEditNameModal) {
      let contentIds = [];
      files.forEach((item) => {
        contentIds.push(item.documentId);
      });
      this.openEditImageNameProcess(contentIds);
    } else {
      this.calculateTotalImage();
      this.getImagesList();
    }

    if (this.isMobile) {
      this.calculateTotalImage();
      this.getImagesList();
    }
  }

  handleImageClick(event) {
    let imageIndex = parseInt(event.target.dataset.imageindex);
    if (this.isMobile && !this.communityId) {
      const componentName = this.nameSpace != '' ? `${this.nameSpace}RSIUC_NavigateToLWC` : 'c__RSIUC_NavigateToLWC';

      this[NavigationMixin.Navigate]({
        type: 'standard__component',
        attributes: {
          componentName: componentName,
        },
        state: {
          c__recordId: this.recordId,
          c__pageType: 'carousel',
          c__totalImages: this.totalImages,
          c__offset: this.offset,
          c__pageSize: this.pageSize,
          c__initialSlide: imageIndex,
          c__sortField: this.sortFieldApi,
          c__order: this.defaultSort,
          c__keyword: this.searchKeyword,
          c__communityId: this.communityId,
          c__communityBaseUrl: this.communityBaseUrl,
          c__nameSpace: this.nameSpace,
          c__acceptedFormatList: this.acceptedFormatList,
        },
      });
    } else {
      this.template.querySelector('c-rsiuc_-Image-Carousel-Modal').openModal(imageIndex);
    }
  }

  handleImageError(event) {
    let linkId = event.target.dataset.linkid;
    this.images.data.every((item) => {
      if (item.Id == linkId) {
        item.imageError = true;
        return false;
      }
      return true;
    });
  }

  handleUrlItemClick(event) {
    let recId = event.target.dataset.id;
    this.images.data.forEach((item) => {
      if (item.Id == recId) {
        this.template.querySelector('c-rsiuc_-Url-Setting-Modal').openModal(item);
      }
    });
  }

  finishUrlItemHandler() {
    //Refresh image list, refresh current record page
    this.isLoaded = true;
    this.offset = 0;
    this.calculateTotalImage();
    this.getImagesList();
    updateRecord({ fields: { Id: this.recordId } });
  }

  handleIconMenuButtonClick() {
    this.allowBlur();
    this.toggleMenuVisibility();
    this.focusOnButton();
  }

  handleIconMenuButtonBlur() {
    if (this._cancelBlur) {
      return;
    }

    this.toggleMenuVisibility();
    this.dispatchEvent(new CustomEvent('blur'));
  }

  allowBlur() {
    this._cancelBlur = false;
  }

  cancelBlur() {
    this._cancelBlur = true;
  }

  toggleMenuVisibility() {
    this._dropdownVisible = !this._dropdownVisible;
    this._dropdownOpened = !this._dropdownOpened && this._dropdownVisible;
    this.template.querySelector('.card-button__menu').classList.toggle('slds-is-open');
  }

  focusOnButton() {
    this.template.querySelector('.card-button__menu-button').focus();
  }

  handleIconMenuButtonFocus() {
    this.dispatchEvent(new CustomEvent('focus'));
  }

  handleMenuClick(event) {
    let target = event.target;

    while (!target.classList.contains('card-button__menu-link')) {
      target = target.parentNode;
    }

    this.toggleMenuVisibility();
    this.listTypeClassName = `listType-${target.dataset.icon}`;
    this.selectedSvgIconUrl = this.iconInfo[target.dataset.icon].url;
  }

  handleSearchFieldChange(event) {
    this.sortFieldApi = event.target.value;
    this.getImagesList();
  }

  handleSearchOrderChange(event) {
    this.defaultSort = event.target.value;
    this.getImagesList();
  }

  filterChange() {
    this.offset = 0;
    this.calculateTotalImage();
    this.getImagesList();
  }

  handleSearchKeyUp(event) {
    const queryTerm = event.target.value;
    const isEnterKey = event.keyCode === 13;

    if (isEnterKey) {
      this.searchKeyword = queryTerm;
      this.filterChange();
    }
  }

  handleSearchChangeValue(event) {
    const queryTerm = event.target.value;

    if ((!queryTerm && queryTerm.trim() === '') || this.isMobile) {
      this.searchKeyword = queryTerm;
      this.filterChange();
    }
  }

  handleSharedToggle(event) {
    this.isLoaded = true;
    const imageWrappers = [
      {
        contentDocumentId: event.target.value,
        isBelongToRecord: true,
        visibility: event.target.checked ? 'AllUsers' : 'InternalUsers',
      },
    ];

    linkImageToRecord({ recordId: this.recordId, imageUrlWrappers: imageWrappers })
      .then((result) => {
        if (result) {
          this.dispatchEvent(new CustomEvent('finish'));
        }
        this.isLoaded = false;
      })
      .catch((error) => {
        this.images.error = error;
        this.isLoaded = false;
      });
  }

  onChangeModalHandler(event) {
    const state = event.detail.state;
    const cardContainer = this.template.querySelector('.card-container');

    if (state === 'open') {
      cardContainer.classList.add('inModal');
    } else {
      cardContainer.classList.remove('inModal');
    }
  }

  handleReloadClick() {
    this.isLoaded = true;
    this.calculateTotalImage();
    this.getImagesList();
  }
}
