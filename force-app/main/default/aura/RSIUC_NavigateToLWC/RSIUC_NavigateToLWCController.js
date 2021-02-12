/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
({
  init: function(component, event, helper) {
    const myPageRef = component.get('v.pageReference');
    component.set('v.recordId', myPageRef.state.c__recordId);
    component.set('v.pageSize', myPageRef.state.c__pageSize);
    component.set('v.linkId', myPageRef.state.c__linkId);
    component.set('v.totalImages', myPageRef.state.c__totalImages);
    component.set('v.offset', myPageRef.state.c__offset);
    component.set('v.initialSlide', myPageRef.state.c__initialSlide);
    component.set('v.pageType', myPageRef.state.c__pageType);
    component.set('v.sortField', myPageRef.state.c__sortField);
    component.set('v.order', myPageRef.state.c__order);
    component.set('v.keyword', myPageRef.state.c__keyword);
    component.set('v.communityId', myPageRef.state.c__communityId);
    component.set('v.communityBaseUrl', myPageRef.state.c__communityBaseUrl);
    component.set('v.nameSpace', myPageRef.state.c__nameSpace);
    component.set('v.acceptedFormatList', myPageRef.state.c__acceptedFormatList);

    if (myPageRef.state.c__contentIds) {
      component.set('v.contentIds', myPageRef.state.c__contentIds.split(','));
    }
  },

  reInit: function(component, event, helper) {
    $A.get('e.force:refreshView').fire();
  }
});
