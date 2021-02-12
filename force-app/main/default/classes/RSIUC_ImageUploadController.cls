/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
public with sharing class RSIUC_ImageUploadController {
    public static final String INVALID_ID_CONTENTDOCUMENTLINK = 'ContentDocumentLinkのIDは正しくないです。';
    public static final String URL_FIELD_ALREADY_USED = '別のファイルで選択されていますので、別の項目を選択してください。';
    public static final String DONT_HAVE_UPDATE_PERMISSION = '「{0}」項目の更新権限がありません。';

    @AuraEnabled
    public static List<ContentDocumentLink> getImagesRelatedToRecord(String recordId, Integer offset, Integer pageSize, String sortField, String order, String keyword, String allowFileType) {
        String searchQuery = '';
        List<String> allowFileTypeList = convertToList(allowFileType);

        if (keyword != NULL && !String.isBlank(keyword)) {
            searchQuery = ' ContentDocument.Title Like \'%'+String.escapeSingleQuotes(keyword.trim())+'%\' AND ';
        }
        if (sortField == NULL || String.isBlank(sortField)) {
            sortField = 'LastModifiedDate';
        }
        if (order == NULL || String.isBlank(order)) {
            order = 'DESC';
        }
        try {
            String query = ''
                +'SELECT Id, '
                +'ContentDocumentId, '
                +'ContentDocument.Title, '
                +'ContentDocument.LastModifiedDate, '
                +'ContentDocument.LatestPublishedVersionId, '
                +'ContentDocument.LatestPublishedVersion.'+getNameSpace()+'URL_item__c, '
                +'ContentDocument.ContentSize, '
                +'ContentDocument.FileType, '
                +'ContentDocument.FileExtension, '
                +'Visibility, '
                +'ShareType '
                +'FROM ContentDocumentLink '
                +'WHERE '+searchQuery+' LinkedEntityId = :recordId AND '
                +'ContentDocument.FileExtension IN :allowFileTypeList '
                +'ORDER BY ContentDocument.'+sortField+' '+order+' '
                +'LIMIT :pageSize OFFSET :offset';
            List<ContentDocumentLink> ContentDocumentLinkList = Database.query(query);

            String ImageUploaderURLRelationQuery = ''
                +'SELECT Id, '
                +getNameSpace()+'RecordId__c, '
                +getNameSpace()+'ContentDocumentId__c, '
                +getNameSpace()+'URL_Item__c '
                +'FROM '+getNameSpace()+'ImageUploaderURLRelation__c '
                +'WHERE '+getNameSpace()+'RecordId__c = :recordId';
            List<ImageUploaderURLRelation__c> ImageUploaderURLRelationList = Database.query(ImageUploaderURLRelationQuery);

            for (ImageUploaderURLRelation__c ImageUploaderURLRelation : ImageUploaderURLRelationList) {
                for (ContentDocumentLink contentDocumentLinkRecord : ContentDocumentLinkList) {
                    if (ImageUploaderURLRelation.ContentDocumentId__c.equals(contentDocumentLinkRecord.ContentDocumentId)) {
                        contentDocumentLinkRecord.ContentDocument.LatestPublishedVersion.URL_item__c = ImageUploaderURLRelation.URL_Item__c;
                        break;
                    }
                }
            }

            return ContentDocumentLinkList;

        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static Integer totalImagesBelongToRecord(String recordId, String keyword, String allowFileType){
        String searchQuery = '';
        List<String> allowFileTypeList = convertToList(allowFileType);

        if (keyword != NULL && !String.isBlank(keyword)) {
            searchQuery = ' ContentDocument.Title Like \'%'+String.escapeSingleQuotes(keyword.trim())+'%\' AND ';
        }

        String query = ''
            +'SELECT count() '
            +'FROM ContentDocumentLink '
            +'WHERE '+ searchQuery +' LinkedEntityId = :recordId AND '
            +'ContentDocument.FileExtension IN :allowFileTypeList';
        return Database.countQuery(query);
    }

    @AuraEnabled
    public static String deleteImageFromRecord(String contentLinkId){
        return RSIUC_ImageUploadControllerUtils.deleteImageFromRecord(contentLinkId);
    }

    @AuraEnabled
    public static List<ImageWrapper> getAllImagesInOrgWithKeyword(String recordId, String keyword, Integer offset, Integer pageSize, String allowFileType) {
        String queryTerm = '';
        String UserId = UserInfo.getUserId();
        List<String> allowFileTypeList = convertToList(allowFileType);

        String qString = ''
            +'SELECT ContentDocumentId, '
            +'ContentDocument.Title, '
            +'ContentDocument.LastModifiedDate, '
            +'ContentDocument.LatestPublishedVersionId, '
            +'ContentDocument.LatestPublishedVersion.'+getNameSpace()+'URL_item__c, '
            +'ContentDocument.ContentSize, '
            +'ContentDocument.FileType, '
            +'ContentDocument.FileExtension '
            +'FROM ContentDocumentLink '
            //+'WHERE LinkedEntityId IN (SELECT Id FROM User) AND ';
            +'WHERE LinkedEntityId = :UserId AND ';

        if (!String.isBlank(keyword)) {
            queryTerm = '%'+String.escapeSingleQuotes(keyword.trim())+'%';
            qString += 'ContentDocument.Title LIKE :queryTerm AND ';
        }

        qString += 'ContentDocument.FileExtension IN :allowFileTypeList '
        +'ORDER BY ContentDocument.LastModifiedDate DESC '
        +'LIMIT :pageSize OFFSET :offset ';

        Set<Id> contentDocumentIds = getContentDocumentIdsRelatedToRecord(recordId, allowFileType);
        List<ImageWrapper> wrappers = new List<ImageWrapper>();
        Set<Id> checkAssigned = new Set<Id>();

        for (List<ContentDocumentLink> contents : Database.query(qString)) {
            //Extract content document id
            List<String> contentDocAll = new List<String>();
            for(ContentDocumentLink content : contents){
                contentDocAll.add(content.ContentDocument.Id);
            }

            for (ContentDocumentLink content : contents) {
                if (!checkAssigned.contains(content.ContentDocumentId)) {
                    wrappers.add(new ImageWrapper(
                        content,
                        contentDocumentIds.contains(content.ContentDocumentId),
                        true
                    ));
                    checkAssigned.add(content.ContentDocumentId);
                }
            }
        }

        return wrappers;
    }

    @AuraEnabled
    public static Integer totalAllImagesInOrgWithKeyword(String keyword, String allowFileType){
        String queryTerm = '';
        String UserId = UserInfo.getUserId();
        List<String> allowFileTypeList = convertToList(allowFileType);

        String qString = ''
            +'SELECT ContentDocumentId '
            +'FROM ContentDocumentLink '
            +'WHERE LinkedEntityId = :UserId AND ';

        if (!String.isBlank(keyword)) {
            queryTerm = '%'+String.escapeSingleQuotes(keyword.trim())+'%';
            qString += 'ContentDocument.Title LIKE :queryTerm AND ';
        }

        qString += 'ContentDocument.FileExtension IN :allowFileTypeList';

        List<ContentDocumentLink> result = Database.query(qString);
        Set<Id> checkAssigned = new Set<Id>();

        for (ContentDocumentLink item : result) {
            if (!checkAssigned.contains(item.ContentDocumentId)) {
                checkAssigned.add(item.ContentDocumentId);
            }
        }

        return checkAssigned.size();
    }

    @AuraEnabled(cacheable=true)
    public static List<PicklistEntry> getAllUrlFieldOfObjectByRecordId(String recordId){
        try{
            List<PicklistEntry> options = new List<PicklistEntry>();
            options.add(new PicklistEntry('なし', ''));
            Id contentId = Id.valueOf(recordId);
            Schema.SObjectType sobjectType = contentId.getSObjectType();

            Map<String,Schema.SObjectField> fieldMap = sobjectType.getDescribe().fields.getMap();
            for(String fieldName : fieldMap.keySet()){
                Schema.DescribeFieldResult fieldDesc = fieldMap.get(fieldName).getDescribe();

                String fieldType = fieldDesc.getType().name();
                if(fieldType == 'URL'){
                    options.add(new PicklistEntry(fieldDesc.getLabel(), fieldDesc.getName()));
                }
            }
            return options;
        }
        catch(Exception ex){
            AuraHandledException e = new AuraHandledException(ex.getMessage());
            e.setMessage(ex.getMessage());
            throw e;
        }
    }

    @AuraEnabled
    public static Boolean linkImageToRecord(String recordId, List<ImageLinkWrapper> imageUrlWrappers){
        return RSIUC_ImageUploadControllerUtils.linkImageToRecord(recordId, imageUrlWrappers);
    }

    @AuraEnabled
    public static Boolean fillUrlItem(String recordId, String versionId, String oldField, String newField, String communityUrl){
        return RSIUC_ImageUploadControllerUtils.fillUrlItem(recordId, versionId, oldField, newField, communityUrl);
    }

    @AuraEnabled
    public static List<ContentDocument> getImagesByContentDocumentIds(List<String> contentIds){
        String query = ''
            +'SELECT Id, '
            +'Title, '
            +'LastModifiedDate, '
            +'LatestPublishedVersionId, '
            +'LatestPublishedVersion.'+getNameSpace()+'URL_item__c, '
            +'ContentSize, '
            +'FileType, '
            +'FileExtension '
            +'FROM ContentDocument '
            +'WHERE Id IN :contentIds '
            +'ORDER BY LastModifiedDate ASC ';
        return Database.query(query);
    }

    @AuraEnabled
    public static Boolean updateContentDocumentName(List<ContentDocument> contentDocs){
        try {
            SObjectAccessDecision decision = Security.stripInaccessible(AccessType.UPDATABLE, contentDocs);
            update decision.getRecords();
            return true;
        } catch (Exception ex) {
            AuraHandledException e = new AuraHandledException(ex.getMessage());
            e.setMessage(ex.getMessage());
            throw e;
        }
    }

    @AuraEnabled
    public static String getBase64Image(String contentVersionId){
        return RSIUC_ImageUploadControllerUtils.getBase64Image(contentVersionId);
    }

    @AuraEnabled
    public static String getNameSpace(){
        return RSIUC_ImageUploadControllerUtils.getNameSpace();
    }

    public static Boolean isUrlFieldAlreadyUsed(String recordId, String versionId, String urlField){
        String query = ''
            +'SELECT Id, '
            +getNameSpace()+'ContentDocumentId__c '
            +'FROM '+getNameSpace()+'ImageUploaderURLRelation__c '
            +'WHERE '+getNameSpace()+'RecordId__c = :recordId AND '+getNameSpace()+'URL_Item__c = :urlField';
        List<ImageUploaderURLRelation__c> imageUploaderURLRelationList = Database.query(query);

        List<String> checkIds = new List<String>();
        for (ImageUploaderURLRelation__c imageUploaderURLRelation : imageUploaderURLRelationList) {
            checkIds.add(imageUploaderURLRelation.ContentDocumentId__c);
        }

        List<ContentDocumentLink> contentDocumentLinkList = [SELECT ContentDocumentId FROM ContentDocumentLink WHERE ContentDocumentId IN :checkIds AND LinkedEntityId = :recordId];
        Set<String> contentIds = new Set<String>();
        for (ContentDocumentLink contentDocumentLinkItem: contentDocumentLinkList) {
            contentIds.add((String) contentDocumentLinkItem.ContentDocumentId);
        }

        //ImageUploaderURLRelation__cとContentDocumentLinkを比較し、ゴミデータを抽出
        List<ImageUploaderURLRelation__c> deleteList = new List<ImageUploaderURLRelation__c>();
        for (ImageUploaderURLRelation__c imageUploaderURLRelation : imageUploaderURLRelationList) {
            if (!contentIds.contains(imageUploaderURLRelation.ContentDocumentId__c)) {
                deleteList.add(imageUploaderURLRelation);
            }
        }

        //関連のないゴミデータのため削除
        if (deleteList.size() > 0) {
            delete deleteList;
        }

        //ゴミデータ削除後再度リストを取得
        List<ImageUploaderURLRelation__c> afterImageUploaderURLRelationList = Database.query(query);

        return !afterImageUploaderURLRelationList.isEmpty();
    }

    private static Set<Id> getContentDocumentIdsRelatedToRecord(String recordId, String allowFileType){
        Set<Id> contentDocumentIds = new Set<Id>();
        List<String> allowFileTypeList = convertToList(allowFileType);

        for (ContentDocumentLink link : [SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = :recordId AND ContentDocument.FileExtension IN :allowFileTypeList]) {
            contentDocumentIds.add(link.ContentDocumentId);
        }

        return contentDocumentIds;
    }

    private static List<String> convertToList(String allowFileType){
        List<String> extentionList = allowFileType.split(',');
        List<String> returnlist = new List<String>();

        for (String item : extentionList) {
            if (!String.isBlank(item)) {
                returnlist.add(item.trim());
            }
        }

        return returnlist;
    }

    public class PicklistEntry {
        @AuraEnabled public String label {get;set;}
        @AuraEnabled public String value {get;set;}
        public PicklistEntry(String label, String value){
            this.label = label;
            this.value = value;
        }
    }

    public class ImageLinkWrapper {
        @AuraEnabled public String contentDocumentId {get;set;}
        @AuraEnabled public Boolean isBelongToRecord {get;set;}
        @AuraEnabled public String visibility {get;set;}
    }

    public class ImageWrapper {
        @AuraEnabled public ContentDocument contentDocument {get;set;}
        @AuraEnabled public Boolean isBelongToRecord {get;set;}
        @AuraEnabled public Boolean hasReadAccess {get;set;}

        public ImageWrapper(ContentDocumentLink contentDocumentLink, Boolean isBelongToRecord, Boolean hasReadAccess){
            this.contentDocument = contentDocumentLink.ContentDocument;
            this.isBelongToRecord = isBelongToRecord;
            this.hasReadAccess = hasReadAccess;
        }
    }
}
