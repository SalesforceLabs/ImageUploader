/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LightningElement, api, track } from 'lwc';

import Paginator_Prev from '@salesforce/label/c.Paginator_Prev';
import Paginator_Next from '@salesforce/label/c.Paginator_Next';

export default class Rsiuc_Paginator extends LightningElement {
  label = {
    Paginator_Prev,
    Paginator_Next,
  };

  @api
  changeView(str) {
    if (str === 'disablePrevious') {
      this.template.querySelector('lightning-button.previous').disabled = true;
    }
    if (str === 'enableNext') {
      this.template.querySelector('lightning-button.next').disabled = false;
    }
    if (str === 'disableNext') {
      this.template.querySelector('lightning-button.next').disabled = true;
    }
    if (str === 'enablePrevious') {
      this.template.querySelector('lightning-button.previous').disabled = false;
    }
  }

  renderedCallback() {
    this.template.querySelector('lightning-button.previous').disabled = true;
    this.template.querySelector('lightning-button.next').disabled = true;
  }

  previousHandler() {
    this.dispatchEvent(new CustomEvent('previous'));
  }

  nextHandler() {
    this.dispatchEvent(new CustomEvent('next'));
  }
}
