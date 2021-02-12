/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
global class RSIUC_getContentDocumentFieldForOption extends VisualEditor.DynamicPickList {
    VisualEditor.DesignTimePageContext context;

    global override VisualEditor.DataRow getDefaultValue(){
        VisualEditor.DataRow defaultValue = new VisualEditor.DataRow('LastModifiedDate', 'LastModifiedDate');
        return defaultValue;
    }

    global override VisualEditor.DynamicPickListRows getValues() {
        VisualEditor.DynamicPickListRows dynamicPickList = new VisualEditor.DynamicPickListRows();

        Map<String, sObjectType> sObjTypeMap = Schema.getGlobalDescribe();
        sObjectType sobjectType = sObjTypeMap.get('ContentDocument');
        Map<String,Schema.SObjectField> fieldMap = sobjectType.getDescribe().fields.getMap();
        List<String> filterField = new List<String>{
            'LastModifiedDate', 'OwnerId', 'Title', 'FileExtension'
        };

        for (String fieldName : fieldMap.keySet()) {
            Schema.DescribeFieldResult fieldDesc = fieldMap.get(fieldName).getDescribe();

            if (filterField.contains(fieldDesc.getName())) {
                VisualEditor.DataRow dataRow = new VisualEditor.DataRow(fieldDesc.getLabel(), fieldDesc.getName());
                dynamicPickList.addRow(dataRow);
            }
        }

        return dynamicPickList;
    }
}
