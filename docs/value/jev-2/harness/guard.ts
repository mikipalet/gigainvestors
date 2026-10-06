import {assertPublishInvariants} from '../../../../scripts/value/publish-invariants';
// Read the released Git objects while inspecting the completed --out tree.
// This is a diagnostic guard check, not a successful real publication.
const root=process.env.PUBFIX_ROOT!;
process.env.GIT_DIR=root+'/corpus/publish-repo/.git';
process.env.GIT_WORK_TREE=root+'/dry-run';
assertPublishInvariants(root+'/dry-run');
