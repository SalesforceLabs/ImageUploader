/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
public with sharing class RSIUC_ImageUploadControllerUtils {
  public static final String ERROR_DELETE_RELATION = System.Label.Apex_ImageUploadControllerUtils_DeletePermissionError;
  public static final String ERROR_DELETE_ATTACHMENT = System.Label.Apex_ImageUploadControllerUtils_DeleteAttachmentPermissionError;
  public static final String ERROR_UPDATE_RECORD = System.Label.Apex_ImageUploadControllerUtils_UpdateRecordError;

  public static String deleteImageFromRecord(String contentLinkId) {
    try {
      Id contentId = Id.valueOf(contentLinkId);
      Schema.SObjectType sobjectType = contentId.getSObjectType();
      String sobjectName = sobjectType.getDescribe().getName();

      if (sobjectName == 'ContentDocumentLink' && Schema.sObjectType.ImageUploaderURLRelation__c.isDeletable() && Schema.sObjectType.ContentDocumentLink.isDeletable()) {
        List<ContentDocumentLink> contentDocumentLinkRecords = [SELECT ContentDocumentId, LinkedEntityId FROM ContentDocumentLink WHERE Id = :contentLinkId];

        List<String> contentDocumentIds = new List<String>();
        List<String> linkedEntityIds = new List<String>();
        for (ContentDocumentLink contentDocumentLinkRecord : contentDocumentLinkRecords) {
          contentDocumentIds.add(contentDocumentLinkRecord.ContentDocumentId);
          linkedEntityIds.add(contentDocumentLinkRecord.LinkedEntityId);
        }
        String deleteQuery = '' + 'SELECT Id ' + 'FROM ' + getNameSpace() + 'ImageUploaderURLRelation__c ' + 'WHERE ' + getNameSpace() + 'ContentDocumentId__c IN :contentDocumentIds AND ' + getNameSpace() + 'RecordId__c IN :linkedEntityIds ';
        delete Database.query(deleteQuery);

        return JSON.serialize(Database.delete(contentLinkId, false));
      } else {
        String errorMessage = RSIUC_ImageUploadController.INVALID_ID_CONTENTDOCUMENTLINK;

        if (!Schema.sObjectType.ImageUploaderURLRelation__c.isDeletable()) {
          errorMessage = ERROR_DELETE_RELATION;
        } else if (!Schema.sObjectType.ContentDocumentLink.isDeletable()) {
          errorMessage = ERROR_DELETE_ATTACHMENT;
        }

        AuraHandledException e = new AuraHandledException(errorMessage);
        e.setMessage(errorMessage);
        throw e;
      }
    } catch (Exception ex) {
      AuraHandledException e = new AuraHandledException(ex.getMessage());
      e.setMessage(ex.getMessage());
      throw e;
    }
  }

  public static Boolean linkImageToRecord(String recordId, List<RSIUC_ImageUploadController.ImageLinkWrapper> imageUrlWrappers) {
    try {
      if (!Schema.sObjectType.ContentDocumentLink.isDeletable()) {
        //重複データの発生を回避するため、削除権限は必須
        AuraHandledException e = new AuraHandledException(ERROR_DELETE_RELATION);
        e.setMessage(ERROR_DELETE_RELATION);
        throw e;
      }

      Set<String> contentDocAll = new Set<String>();
      List<ContentDocumentLink> contentDocAdded = new List<ContentDocumentLink>();

      for (RSIUC_ImageUploadController.ImageLinkWrapper wrapper : imageUrlWrappers) {
        if (wrapper.isBelongToRecord) {
          ContentDocumentLink link = new ContentDocumentLink();
          link.LinkedEntityId = recordId;
          link.ContentDocumentId = wrapper.contentDocumentId;
          link.ShareType = 'I';
          link.Visibility = wrapper.visibility;
          contentDocAdded.add(link);
        }
        contentDocAll.add(wrapper.contentDocumentId);
      }

      delete [SELECT Id FROM ContentDocumentLink WHERE ContentDocumentId IN :contentDocAll AND LinkedEntityId = :recordId];

      SObjectAccessDecision decision = Security.stripInaccessible(AccessType.CREATABLE, contentDocAdded);
      insert decision.getRecords();
      return true;
    } catch (Exception ex) {
      AuraHandledException e = new AuraHandledException(ex.getMessage());
      e.setMessage(ex.getMessage());
      throw e;
    }
  }

  public static Boolean fillUrlItem(String recordId, String versionId, String oldField, String newField, String communityUrl) {
    try {
      if (String.isNotBlank(newField) && RSIUC_ImageUploadController.isUrlFieldAlreadyUsed(recordId, versionId, newField) || !Schema.sObjectType.ImageUploaderURLRelation__c.isDeletable() || !Schema.sObjectType.ImageUploaderURLRelation__c.isCreateable()) {
        String errorMessage = RSIUC_ImageUploadController.URL_FIELD_ALREADY_USED;

        if (!Schema.sObjectType.ImageUploaderURLRelation__c.isDeletable() || !Schema.sObjectType.ImageUploaderURLRelation__c.isCreateable()) {
          errorMessage = ERROR_UPDATE_RECORD;
        }

        AuraHandledException e = new AuraHandledException(errorMessage);
        e.setMessage(errorMessage);
        throw e;
      }

      String contentDocumentId = [SELECT Id, ContentDocumentId, Title FROM ContentVersion WHERE Id = :versionId].ContentDocumentId;
      delete [SELECT Id FROM ImageUploaderURLRelation__c WHERE RecordId__c = :recordId AND ContentDocumentId__c = :contentDocumentId];

      if (String.isNotBlank(newField)) {
        ImageUploaderURLRelation__c imageUploaderURLRelationObj = new ImageUploaderURLRelation__c();
        imageUploaderURLRelationObj.RecordId__c = recordId;
        imageUploaderURLRelationObj.ContentDocumentId__c = ContentDocumentId;
        imageUploaderURLRelationObj.URL_Item__c = newField;
        insert imageUploaderURLRelationObj;
      }

      oldField = String.isNotBlank(oldField) ? oldField.toLowerCase() : '';
      newField = String.isNotBlank(newField) ? newField.toLowerCase() : '';

      Id recId = Id.valueOf(recordId);
      Schema.SObjectType sobjectType = recId.getSObjectType();

      SObject obj = sobjectType.newSObject();
      obj.put('Id', recId);

      Map<String, Schema.SObjectField> fieldMap = sobjectType.getDescribe().fields.getMap();
      if (fieldMap.keySet().contains(oldField)) {
        Schema.DescribeFieldResult fieldDesc = fieldMap.get(oldField).getDescribe();
        if (fieldDesc.isUpdateable()) {
          obj.put(oldField, null);
        } else {
          String errorText = String.format(RSIUC_ImageUploadController.DONT_HAVE_UPDATE_PERMISSION, new List<String>{ oldField });
          AuraHandledException e = new AuraHandledException(errorText);
          e.setMessage(errorText);
          throw e;
        }
      }

      if (fieldMap.keySet().contains(newField)) {
        Schema.DescribeFieldResult fieldDesc = fieldMap.get(newField).getDescribe();
        if (fieldDesc.isUpdateable()) {
          obj.put(newField, URL.getOrgDomainUrl().toExternalForm() + '/' + versionId);
        } else {
          String errorText = String.format(RSIUC_ImageUploadController.DONT_HAVE_UPDATE_PERMISSION, new List<String>{ newField });
          AuraHandledException e = new AuraHandledException(errorText);
          e.setMessage(errorText);
          throw e;
        }
      }

      update obj;
      return true;
    } catch (Exception ex) {
      AuraHandledException e = new AuraHandledException(ex.getMessage());
      e.setMessage(ex.getMessage());
      throw e;
    }
  }

  public static String getBase64Image(String contentVersionId) {
    try {
      ContentVersion content = [SELECT FileType, VersionData FROM ContentVersion WHERE Id = :contentVersionId LIMIT 1];
      String src = 'data:image/' + content.FileType + ';base64,' + EncodingUtil.base64Encode(content.VersionData);

      return src;
    } catch (Exception ex) {
      AuraHandledException e = new AuraHandledException(ex.getMessage());
      e.setMessage(ex.getMessage());
      throw e;
    }
  }

  public static String getNameSpace() {
    String nameSpacePrefix = '';
    List<String> names = RSIUC_ImageUploadControllerUtils.class.getName().split('\\.');

    if (names.size() > 1) {
      nameSpacePrefix = names[0] + '__';
    }

    return nameSpacePrefix;
  }
}
