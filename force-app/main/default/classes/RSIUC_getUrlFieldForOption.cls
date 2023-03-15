/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
global with sharing class RSIUC_getUrlFieldForOption extends VisualEditor.DynamicPickList {
  private VisualEditor.DesignTimePageContext context;

  global RSIUC_getUrlFieldForOption(VisualEditor.DesignTimePageContext context) {
    this.context = context;
  }

  global override VisualEditor.DataRow getDefaultValue() {
    VisualEditor.DataRow defaultValue = new VisualEditor.DataRow('None', 'None');
    return defaultValue;
  }

  global override VisualEditor.DynamicPickListRows getValues() {
    VisualEditor.DynamicPickListRows dynamicPickList = new VisualEditor.DynamicPickListRows();

    if (context.entityName != null) {
      Map<String, sObjectType> sObjTypeMap = Schema.getGlobalDescribe();
      sObjectType sobjectType = sObjTypeMap.get(context.entityName);
      Map<String, Schema.SObjectField> fieldMap = sobjectType.getDescribe().fields.getMap();

      VisualEditor.DataRow defaultDataRow = new VisualEditor.DataRow('None', 'None');
      dynamicPickList.addRow(defaultDataRow);

      for (String fieldName : fieldMap.keySet()) {
        if (fieldName != null) {
          Schema.DescribeFieldResult fieldDesc = fieldMap.get(fieldName).getDescribe();
          String fieldType = fieldDesc.getType().name();

          if (fieldType == 'URL') {
            VisualEditor.DataRow dataRow = new VisualEditor.DataRow(fieldDesc.getLabel(), fieldDesc.getName());
            dynamicPickList.addRow(dataRow);
          }
        }
      }
    }

    return dynamicPickList;
  }
}
