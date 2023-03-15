/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

@isTest
public with sharing class RSIUC_ComponentOptionsTest {
  @isTest
  static void getContentDocumentFieldForOptionTest() {
    VisualEditor.DesignTimePageContext context = new VisualEditor.DesignTimePageContext();
    context.entityName = 'ContentDocument';

    RSIUC_getContentDocumentFieldForOption contentDocumentFieldForOption = new RSIUC_getContentDocumentFieldForOption(context);
    VisualEditor.DynamicPickListRows getValuesResult = contentDocumentFieldForOption.getValues();
    VisualEditor.DataRow getDefaultValueResult = contentDocumentFieldForOption.getDefaultValue();
    String checkValue = 'LastModifiedDate';
    String conteinsValue = '';

    for (VisualEditor.DataRow row : getValuesResult.getDataRows()) {
      if (checkValue.equals((String) row.getValue())) {
        conteinsValue = (String) row.getValue();
      }
    }

    System.assert(conteinsValue == checkValue);
    System.assert(getDefaultValueResult.getValue() == checkValue);
  }

  @isTest
  static void getUrlFieldForOptionTest() {
    VisualEditor.DesignTimePageContext context = new VisualEditor.DesignTimePageContext();
    context.entityName = 'Account';

    RSIUC_getUrlFieldForOption urlFieldForOption = new RSIUC_getUrlFieldForOption(context);
    VisualEditor.DynamicPickListRows getValuesResult = urlFieldForOption.getValues();
    VisualEditor.DataRow getDefaultValueResult = urlFieldForOption.getDefaultValue();
    String checkValue = 'None';
    String conteinsValue = '';

    for (VisualEditor.DataRow row : getValuesResult.getDataRows()) {
      if (checkValue.equals((String) row.getLabel())) {
        conteinsValue = (String) row.getLabel();
      }
    }

    System.assert(conteinsValue == checkValue);
    System.assert(getDefaultValueResult.getLabel() == checkValue);
  }
}
