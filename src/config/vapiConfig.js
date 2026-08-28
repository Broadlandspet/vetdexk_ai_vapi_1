require('dotenv').config();

module.exports = {
    VAPI_API_KEY: process.env.VAPI_API_KEY,
    VAPI_API_BASE_URL: process.env.VAPI_API_BASE_URL || 'https://api.vapi.ai',

    // Static tool list attached to every MAIN calling assistant
    // (same 23 tools you used when creating "Broadland 3", plus the
    // dynamically-created transfer tool gets appended at runtime).
    MAIN_ASSISTANT_STATIC_TOOL_IDS: [
        '23da3be2-210e-49c8-a792-6e7ea655afcd',
        '2c131de6-a9b6-4f18-b243-50f64c74c805',
        '162490f2-8808-44ed-9b08-1c9f8123c51f',
        '51558f43-e394-457e-bda6-f4aeeb13a1f7',
        '48431491-6974-4609-9505-26d6ae39e37f',
        '7910fa49-b516-4014-8ce6-5a31d5e02d5c',
        '316d4d03-e970-479d-bdb2-b1e8a24337cd',
        'edd19960-40b8-432e-be32-d879208c7b51',
        '550d3053-53c5-4481-8fe6-fbc22ec60ef8',
        'b239fc1f-a505-4855-a224-83784cacb843',
        'be6e7bff-6d54-40b8-b0b9-ad7f0a9eae01',
        'a89c750f-7969-4253-8867-a21a2bee16b6',
        // '346fee2f-c034-40cf-b3a3-dd28acdb988f',
        'a33ba156-655a-44f8-a97e-1cf42169b0b0',
        '8667b59c-2737-4003-9381-67f85e58c934',
        '43e19639-18cc-4f61-80b3-cc43a6002b7c',
        '4a5fe3e9-2b5f-477c-b4e8-94a1fd65a202',
        'fb6e8944-9cb1-4ae5-baed-d8e508569ef2',
        '9f2fa92e-1e21-4877-a132-5e520e4dc7a2',
        '67f68681-97c3-454f-935b-d3ac90eca786',
        '986740db-92e6-40db-ae88-4244dc0188b3',
        '27b60661-b872-49ed-b142-960626cc0b20',
        'bbcd8968-d1c4-4b05-a677-61011d291162',
        'fa9a2f0f-64f1-4be9-8804-245656fac138'
    ],

    // Static tool list attached to every FEEDBACK assistant
    FEEDBACK_ASSISTANT_STATIC_TOOL_IDS: [
        '2c131de6-a9b6-4f18-b243-50f64c74c805'
    ],



    DEACTIVATED_STATIC_ASSISTANT_ID: '0c574b6a-676f-4316-bd3c-22ab9a0e131d'
};