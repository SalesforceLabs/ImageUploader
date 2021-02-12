/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
@isTest
public with sharing class RSIUC_ImageUploadControllerTest {
    static final String FILE_TYPE = 'jpg, jpeg, png, ppt, pptx, xls, xlsx, doc, docx, pdf';

    @testSetup static void setup() {
        // Setup test data
        // This code runs as the system user
        Profile p = [SELECT Id FROM Profile WHERE Name IN ('システム管理者','System Administrator')];
        User u = new User(Alias = 'standt', Email='standarduser@testorg.com',
                          EmailEncodingKey='UTF-8', LastName='Testing', LanguageLocaleKey='en_US',
                          LocaleSidKey='en_US', ProfileId = p.Id,
                          TimeZoneSidKey='America/Los_Angeles', UserName='standarduser+imageuploader-test@imageuploader.com');
        insert u;

        Account acct = new Account(Name='TEST_ACCT');
        insert acct;

        System.runAs(u) {
            List<ContentVersion> contentVersions = new List<ContentVersion>();
            for(integer i = 1; i <= 10; i++){
                ContentVersion contentVersion = new ContentVersion(
                    Title = 'Penguins ' + i,
                    PathOnClient = 'Penguins.jpg',
                    VersionData = Blob.valueOf('Test Content'),
                    IsMajorVersion = true
                );
                contentVersions.add(contentVersion);
            }
            insert contentVersions;

            List<ContentDocumentLink> contentLinks = new List<ContentDocumentLink>();
            for(ContentDocument document : [SELECT Id FROM ContentDocument]){
                ContentDocumentLink cdl = New ContentDocumentLink();
                cdl.LinkedEntityId = acct.id;
                cdl.ContentDocumentId = document.Id;
                cdl.shareType = 'V';
                contentLinks.add(cdl);
            }
            insert contentLinks;
        }
    }

    @isTest static void getImagesRelatedToRecordSuccess1(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<ContentDocumentLink> links = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, 0, 5, NULL, NULL, NULL, FILE_TYPE);
            System.assert(links.size() == 5);
            System.assert(links[0].ContentDocument.Title == 'Penguins 10');
            System.assert(links[1].ContentDocument.Title == 'Penguins 9');
            System.assert(links[2].ContentDocument.Title == 'Penguins 8');
            System.assert(links[3].ContentDocument.Title == 'Penguins 7');
            System.assert(links[4].ContentDocument.Title == 'Penguins 6');
        }
    }

    @isTest static void getImagesRelatedToRecordSuccess2(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<ContentDocumentLink> links = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, 1, 5, 'LastModifiedDate', 'DESC', 'Penguins', FILE_TYPE);
            System.assert(links.size() == 5);
            System.assert(links[0].ContentDocument.Title == 'Penguins 9');
            System.assert(links[1].ContentDocument.Title == 'Penguins 8');
            System.assert(links[2].ContentDocument.Title == 'Penguins 7');
            System.assert(links[3].ContentDocument.Title == 'Penguins 6');
            System.assert(links[4].ContentDocument.Title == 'Penguins 5');
        }
    }

    @isTest static void getImagesRelatedToRecordSuccess3(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<ContentDocumentLink> links = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, 5, 5, 'LastModifiedDate', 'DESC', '', FILE_TYPE);
            System.assert(links.size() == 5);
            System.assert(links[0].ContentDocument.Title == 'Penguins 5');
            System.assert(links[1].ContentDocument.Title == 'Penguins 4');
            System.assert(links[2].ContentDocument.Title == 'Penguins 3');
            System.assert(links[3].ContentDocument.Title == 'Penguins 2');
            System.assert(links[4].ContentDocument.Title == 'Penguins 1');
        }
    }

    @isTest static void getImagesRelatedToRecordError1(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            AuraHandledException auraException;
            Account acc = [Select Id From Account Limit 1];
            try {
                List<ContentDocumentLink> links = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, -1, 5, 'LastModifiedDate', 'DESC', '', FILE_TYPE);
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
        }
    }

    @isTest static void getImagesRelatedToRecordError2(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            AuraHandledException auraException;
            Account acc = [Select Id From Account Limit 1];
            try {
                List<ContentDocumentLink> links = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, 2001, 5, 'LastModifiedDate', 'DESC', '', FILE_TYPE);
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
        }
    }

    @isTest static void getTotalImagesRelatedToRecordSuccess(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            Integer total = RSIUC_ImageUploadController.totalImagesBelongToRecord((String)acc.Id, 'Penguins', FILE_TYPE);
            System.assert(total == 10);
        }
    }

    @isTest static void deleteImageFromRecordSuccess(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            ContentDocumentLink link = [Select Id From ContentDocumentLink Where LinkedEntityId = :acc.Id Limit 1];
            String json = RSIUC_ImageUploadController.deleteImageFromRecord((String)link.Id);
            System.assert(String.isNotBlank(json));
        }
    }

    @isTest static void deleteImageFromRecordError1(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            AuraHandledException auraException;
            Account acc = [Select Id From Account Limit 1];
            try {
                String json = RSIUC_ImageUploadController.deleteImageFromRecord((String)acc.Id);
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
            System.assert(auraException.getMessage() == RSIUC_ImageUploadController.INVALID_ID_CONTENTDOCUMENTLINK);
        }
    }

    @isTest static void getAllImagesInOrgWithKeywordSuccess1(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<RSIUC_ImageUploadController.ImageWrapper> wrappers = RSIUC_ImageUploadController.getAllImagesInOrgWithKeyword((String)acc.Id, 'Penguins', 0, 5, FILE_TYPE);
            System.assert(wrappers.size() == 5);
            System.assert(wrappers[0].contentDocument.Title == 'Penguins 10');
            System.assert(wrappers[1].contentDocument.Title == 'Penguins 9');
            System.assert(wrappers[2].contentDocument.Title == 'Penguins 8');
            System.assert(wrappers[3].contentDocument.Title == 'Penguins 7');
            System.assert(wrappers[4].contentDocument.Title == 'Penguins 6');
        }
    }

    @isTest static void getAllImagesInOrgWithKeywordSuccess2(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<RSIUC_ImageUploadController.ImageWrapper> wrappers = RSIUC_ImageUploadController.getAllImagesInOrgWithKeyword((String)acc.Id, '', 0, 5, FILE_TYPE);
            System.assert(wrappers.size() == 5);
            System.assert(wrappers[0].contentDocument.Title == 'Penguins 10');
            System.assert(wrappers[1].contentDocument.Title == 'Penguins 9');
            System.assert(wrappers[2].contentDocument.Title == 'Penguins 8');
            System.assert(wrappers[3].contentDocument.Title == 'Penguins 7');
            System.assert(wrappers[4].contentDocument.Title == 'Penguins 6');
        }
    }

    @isTest static void getAllImagesInOrgWithKeywordSuccess3(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<RSIUC_ImageUploadController.ImageWrapper> wrappers = RSIUC_ImageUploadController.getAllImagesInOrgWithKeyword((String)acc.Id, '5', 0, 5, FILE_TYPE);
            System.assert(wrappers.size() == 1);
            System.assert(wrappers[0].contentDocument.Title == 'Penguins 5');
        }
    }

    @isTest static void getAllImagesInOrgWithKeywordSuccess4(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            delete [Select Id From ContentDocumentLink Where LinkedEntityId = :acc.Id];
            List<RSIUC_ImageUploadController.ImageWrapper> wrappers = RSIUC_ImageUploadController.getAllImagesInOrgWithKeyword((String)acc.Id, '', 0, 10, FILE_TYPE);
            System.assert(wrappers.size() == 10);
            System.assert(wrappers[0].isBelongToRecord == false);
            System.assert(wrappers[1].isBelongToRecord == false);
            System.assert(wrappers[2].isBelongToRecord == false);
            System.assert(wrappers[3].isBelongToRecord == false);
            System.assert(wrappers[4].isBelongToRecord == false);
            System.assert(wrappers[5].isBelongToRecord == false);
            System.assert(wrappers[6].isBelongToRecord == false);
            System.assert(wrappers[7].isBelongToRecord == false);
            System.assert(wrappers[8].isBelongToRecord == false);
            System.assert(wrappers[9].isBelongToRecord == false);
        }
    }

    @isTest static void getTotalAllImagesInOrgWithKeywordSuccess1(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Integer total = RSIUC_ImageUploadController.totalAllImagesInOrgWithKeyword('5', FILE_TYPE);
            System.assert(total == 1);
        }
    }

    @isTest static void getTotalAllImagesInOrgWithKeywordSuccess2(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Integer total = RSIUC_ImageUploadController.totalAllImagesInOrgWithKeyword(null, FILE_TYPE);
            System.assert(total == 10);
        }
    }

    @isTest static void getAllUrlFieldOfObjectByRecordIdSuccess(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<RSIUC_ImageUploadController.PicklistEntry> entryList = RSIUC_ImageUploadController.getAllUrlFieldOfObjectByRecordId((String)acc.Id);
            System.assert(entryList.size() > 0);
        }
    }

    @isTest static void getAllUrlFieldOfObjectByRecordIdError(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            AuraHandledException auraException;
            Account acc = [Select Id From Account Limit 1];
            try {
                List<RSIUC_ImageUploadController.PicklistEntry> entryList = RSIUC_ImageUploadController.getAllUrlFieldOfObjectByRecordId('random string');
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
        }
    }

    @isTest static void linkImageToRecordSuccess1(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<ContentVersion> contentVersions = new List<ContentVersion>();
            for(integer i = 11; i <= 20; i++){
                ContentVersion contentVersion = new ContentVersion(
                    Title = 'Penguins ' + i,
                    PathOnClient = 'Penguins.jpg',
                    VersionData = Blob.valueOf('Test Content'),
                    IsMajorVersion = true
                );
                contentVersions.add(contentVersion);
            }
            insert contentVersions;

            List<RSIUC_ImageUploadController.ImageLinkWrapper> imageUrlWrappers = new List<RSIUC_ImageUploadController.ImageLinkWrapper>();

            for(ContentVersion version : [Select Id, ContentDocumentId From ContentVersion Where Id In :contentVersions]){
                RSIUC_ImageUploadController.ImageLinkWrapper wrapper = new RSIUC_ImageUploadController.ImageLinkWrapper();
                wrapper.contentDocumentId = version.ContentDocumentId;
                wrapper.isBelongToRecord = true;
                imageUrlWrappers.add(wrapper);
            }

            Boolean result = RSIUC_ImageUploadController.linkImageToRecord((String)acc.Id, imageUrlWrappers);
            System.assert(result == true);

            List<ContentDocumentLink> links = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, 0, 100, 'LastModifiedDate', 'DESC', '', FILE_TYPE);
            System.assert(links.size() == 20);
        }
    }

    @isTest static void linkImageToRecordSuccess2(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<RSIUC_ImageUploadController.ImageLinkWrapper> imageUrlWrappers = new List<RSIUC_ImageUploadController.ImageLinkWrapper>();

            List<ContentDocumentLink> links = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, 0, 10, 'LastModifiedDate', 'DESC', '', FILE_TYPE);
            for(ContentDocumentLink link : links){
                RSIUC_ImageUploadController.ImageLinkWrapper wrapper = new RSIUC_ImageUploadController.ImageLinkWrapper();
                wrapper.contentDocumentId = link.ContentDocumentId;
                wrapper.isBelongToRecord = false;
                imageUrlWrappers.add(wrapper);
            }

            Boolean result = RSIUC_ImageUploadController.linkImageToRecord((String)acc.Id, imageUrlWrappers);
            System.assert(result == true);

            List<ContentDocumentLink> linksAfter = RSIUC_ImageUploadController.getImagesRelatedToRecord((String)acc.Id, 0, 100, 'LastModifiedDate', 'DESC', '', FILE_TYPE);
            System.assert(linksAfter.size() == 0);
        }
    }

    @isTest static void linkImageToRecordError(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            List<RSIUC_ImageUploadController.ImageLinkWrapper> imageUrlWrappers = new List<RSIUC_ImageUploadController.ImageLinkWrapper>();

            RSIUC_ImageUploadController.ImageLinkWrapper wrapper = new RSIUC_ImageUploadController.ImageLinkWrapper();
            wrapper.contentDocumentId = 'abcxyz';
            wrapper.isBelongToRecord = true;
            imageUrlWrappers.add(wrapper);

            AuraHandledException auraException;
            try {
                Boolean result = RSIUC_ImageUploadController.linkImageToRecord((String)acc.Id, imageUrlWrappers);
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
        }
    }

    @isTest static void fillUrlItemSuccess1(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            ContentDocumentLink link = [Select Id, ContentDocument.LatestPublishedVersionId From ContentDocumentLink Where LinkedEntityId = :acc.Id Limit 1];
            Boolean result = RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link.ContentDocument.LatestPublishedVersionId, '', 'Website', '');
            System.assert(result == true);
            Account accResult = [Select Id, Website From Account Limit 1];
            System.assert(accResult.Website == URL.getOrgDomainUrl().toExternalForm() + '/' + link.ContentDocument.LatestPublishedVersionId);
        }
    }

    @isTest static void fillUrlItemSuccess2(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            ContentDocumentLink link = [Select Id, ContentDocument.LatestPublishedVersionId From ContentDocumentLink Where LinkedEntityId = :acc.Id Limit 1];
            Boolean result = RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link.ContentDocument.LatestPublishedVersionId, 'Website', 'Website', '');
            System.assert(result == true);
            Account accResult = [Select Id, Website From Account Limit 1];
            System.assert(accResult.Website == URL.getOrgDomainUrl().toExternalForm() + '/' + link.ContentDocument.LatestPublishedVersionId);
        }
    }

    @isTest static void fillUrlItemSuccess3(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            acc.Website = 'https://www.google.com';
            update acc;

            ContentDocumentLink link = [Select Id, ContentDocument.LatestPublishedVersionId From ContentDocumentLink Where LinkedEntityId = :acc.Id Limit 1];
            Boolean result = RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link.ContentDocument.LatestPublishedVersionId, 'Website', '', '');
            System.assert(result == true);
            Account accResult = [Select Id, Website From Account Limit 1];
            System.assert(String.isBlank(accResult.Website));
        }
    }

    @isTest static void fillUrlItemSuccess4(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            ContentDocumentLink link = [Select Id, ContentDocument.LatestPublishedVersionId From ContentDocumentLink Where LinkedEntityId = :acc.Id Limit 1];
            Boolean result = RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link.ContentDocument.LatestPublishedVersionId, '', '', '');
            System.assert(result == true);
            Account accResult = [Select Id, Website From Account Limit 1];
            System.assert(String.isBlank(accResult.Website));
        }
    }

    @isTest static void fillUrlItemSuccess5(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            ContentDocumentLink link = [Select Id, ContentDocument.LatestPublishedVersionId From ContentDocumentLink Where LinkedEntityId = :acc.Id Limit 1];
            RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link.ContentDocument.LatestPublishedVersionId, '', 'Website', '');
            RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link.ContentDocument.LatestPublishedVersionId, 'Website', '', '');
            ContentVersion version = [Select URL_item__c From ContentVersion Where Id = :link.ContentDocument.LatestPublishedVersionId Limit 1];
            System.assert(String.isBlank(version.URL_item__c));
        }
    }

    @isTest static void fillUrlItemAlreadyExist(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            Account acc = [Select Id From Account Limit 1];
            ContentDocumentLink link = [Select Id, ContentDocument.LatestPublishedVersionId From ContentDocumentLink Where LinkedEntityId = :acc.Id Limit 1];
            RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link.ContentDocument.LatestPublishedVersionId, '', 'Website', '');

            ContentDocumentLink link2 = [Select Id, ContentDocument.LatestPublishedVersionId From ContentDocumentLink Where LinkedEntityId = :acc.Id And Id != :link.Id Limit 1];


            AuraHandledException auraException;
            try {
                RSIUC_ImageUploadController.fillUrlItem((String)acc.Id, (String)link2.ContentDocument.LatestPublishedVersionId, '', 'Website', '');
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
            System.assert(auraException.getMessage() == RSIUC_ImageUploadController.URL_FIELD_ALREADY_USED);
        }
    }

    @isTest static void getContentDocumentByIdSuccess(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            List<ContentDocument> documents = [Select Id From ContentDocument];
            List<String> documentIds = new List<String>();
            for(ContentDocument doc : documents){
                documentIds.add(doc.Id);
            }
            documents = RSIUC_ImageUploadController.getImagesByContentDocumentIds(documentIds);
            System.assert(documents.size() == 10);
            System.assert(documents[0].Title.contains('Penguins') == true);
        }
    }

    @isTest static void updateContentDocumentNameSuccess(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            List<ContentDocument> documents = [Select Id From ContentDocument];
            List<String> documentIds = new List<String>();
            for(ContentDocument doc : documents){
                doc.Title = 'abc';
                documentIds.add(doc.Id);
            }
            Boolean result = RSIUC_ImageUploadController.updateContentDocumentName(documents);
            documents = RSIUC_ImageUploadController.getImagesByContentDocumentIds(documentIds);
            System.assert(result == true);
            System.assert(documents[0].Title == 'abc');
        }
    }

    @isTest static void updateContentDocumentNameError(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {

            List<ContentDocument> documents = [Select Id From ContentDocument];
            for(ContentDocument doc : documents){
                doc.Title = 'abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc';
            }
            AuraHandledException auraException;
            try {
                RSIUC_ImageUploadController.updateContentDocumentName(documents);
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
        }
    }

    @isTest static void getBase64ImageSuccess(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            ContentVersion content = [Select Id, FileType, VersionData From ContentVersion Limit 1];
            String result = RSIUC_ImageUploadController.getBase64Image(content.Id);
            String assertResult = 'data:image/' + content.FileType + ';base64,' + EncodingUtil.base64Encode(content.VersionData);
            System.assert(result == assertResult);
        }
    }

    @isTest static void getBase64ImageError(){
        USER u = [SELECT Id FROM USER WHERE UserName='standarduser+imageuploader-test@imageuploader.com' LIMIT 1];
        System.runAs(u) {
            AuraHandledException auraException;
            try {
                RSIUC_ImageUploadController.getBase64Image('dummy text');
            } catch (AuraHandledException ex) {
                auraException = ex;
            }
            System.assert(auraException != null);
        }
    }
}
