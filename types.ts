import { ReactNode } from 'react';

/**
 * One idea on one list.
 *
 * Note what is missing: `purchasedById`. The database stores it, and the server
 * reads it to decide who is allowed to clear a mark, but it is not part of this
 * type - so no endpoint can hand it to the client without the type changing and
 * the change being noticed. The buyer's identity is not a product output, and the
 * cheapest way to keep it that way is for it not to exist on the way out.
 */
export interface Gift {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
  listId: string;
  /**
   * Whether this reader may take the mark back off this idea.
   *
   * Per idea, and computed by the server, which is the only place that can know it:
   * it follows from `purchasedById`, and `purchasedById` is not on this type and
   * must never be. An owner may clear a mark they set and is refused one somebody
   * else set; a buyer may clear any. A client trying to derive this from
   * `isPurchased` alone can only reach "an owner may not clear any mark", which
   * forbids undoing "I already bought this myself" while the server would allow it.
   *
   * It answers *may I*, not *who did*, so it discloses no name and no id.
   */
  canClear: boolean;
}

/**
 * How far a list reaches. Mirrors the `ListVisibility` enum in the Prisma schema.
 *
 * `SHARED` means "the accounts named in this list's access list, and nobody else".
 * It is not public, not discoverable, and not reachable by link.
 */
export type ListVisibility = 'PRIVATE' | 'SHARED';

/**
 * One person who may read one list.
 *
 * `accountId` is `null` only if the account was deleted while holding access;
 * `email` is stored so the row stays nameable in that case.
 */
export interface ListAccess {
  id: string;
  accountId: string | null;
  email: string;
  displayName: string;
  grantedAt: string;
}

/**
 * One account that a search matched, and nothing else about it.
 *
 * Four fields, listed rather than spread, for the reason `lib/wire.ts` gives: `Gift`
 * on the wire is a strict subset of `Gift` on disk, so a spread would ship a new
 * column to the browser the first time one was added to the schema and nothing would
 * fail. `password` and `createdAt` are the two that exist on the row and are
 * deliberately absent here.
 *
 * `matched` says which of the two columns the query actually hit. It is the only way
 * the result list can answer the question the requirement is really about - which of
 * two similar handles is the person I meant - without the owner having to compare two
 * addresses by eye, and it is derived from the caller's own query rather than said
 * anything about the account it found.
 */
export interface AccountSearchResult {
  id: string;
  nickname: string;
  displayName: string;
  email: string;
  matched: 'email' | 'nickname';
}

/**
 * One of a person's own groups.
 *
 * `memberCount` rides along rather than being a second request, for the reason
 * `readableListSummary` gives its owner name and audience count: two queries means a
 * window in which the two halves of a sheet disagree about how many people something
 * reaches.
 */
export interface Group {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

/**
 * One account inside one group.
 *
 * Carries the address and the handle, and the owner is the only person who ever sees
 * either: a member is shown the list they have reached, never the group that reached
 * it, because whose group somebody is in is the group owner's business.
 */
export interface GroupMember {
  id: string;
  accountId: string;
  nickname: string;
  displayName: string;
  email: string;
  addedAt: string;
}

/**
 * One list shared with one group - the audience row that is a group rather than a
 * person.
 *
 * The row is deliberately not the group's member list. A group with nine members is
 * one grant, and printing nine names here would say the list is shared nine times
 * when it is shared once; `memberCount` is the size of the group, and what it reaches
 * is worked out per reader by `lib/list-access.ts` rather than shown to anybody.
 */
export interface ListGroupAccess {
  id: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  grantedAt: string;
}

/**
 * A list as the contents page and the share dialog both need to describe it.
 *
 * One type rather than one for an owned list and one for a shared list: the two
 * differ in which controls the row offers, and that is a boolean, not a different
 * shape. Two parallel interfaces were the earlier model's mistake - the member
 * list and the shared-lists view had drifted because each had its own.
 */
export interface ListSummary {
  id: string;
  name: string;
  visibility: ListVisibility;
  /** The owner's name. Carried on a shared list because that is what identifies it. */
  ownerId: string;
  ownerDisplayName: string;
  giftCounts: MemberGiftCounts;
  /** How many people the list is shared with directly. Zero on a private list. */
  sharedWithCount: number;
  /**
   * How many *groups* reach this list, counted separately from `sharedWithCount`.
   *
   * A separate number rather than one figure counting people, because the honest
   * people count is not a cheap query and the dishonest one is worse than useless.
   * Individuals plus group members has overlaps - somebody in two granted groups is
   * one reader, not two - so an exact figure needs a distinct-count over a join, and
   * `sharedWithCount` reads a `_count` on one relation. What the owner is actually
   * asking on the contents page is "how wide does this reach", and "3 people · 1
   * group" answers it without either the join or a number that could be wrong.
   */
  sharedWithGroupCount: number;
  /** Whether the signed-in account owns this list, which decides every affordance. */
  isOwner: boolean;
  createdAt: string;
}

export interface Features {
  [key: string]: {
    title: string;
    description: string;
  };
}

export interface Translations {
  tagline: string;
  login: string;
  register: string;
  loading: string;
  cancel: string;
  close: string;

  /** The three registration fields, and the two on the sign-in sheet. */
  email: string;
  displayName: string;
  /**
   * The unique handle, chosen once at registration and used to sign in.
   *
   * Distinct from `displayName` on purpose, and the distinction is the whole reason
   * it exists: display names are not unique - two accounts are both called Anna - so
   * a display name cannot identify anybody. See `lib/nickname.ts`.
   */
  nickname: string;
  password: string;
  confirmPassword: string;
  /**
   * The sign-in field's printed label.
   *
   * It is not "email", because the field accepts a nickname too - and a label that
   * names only one of the two things the field takes is a label that is wrong for
   * half the people who use it.
   */
  loginIdentifier: string;
  /**
   * What the nickname is for, on the registration sheet.
   *
   * Its own key rather than a shared one with the sign-in sheet, because the two
   * sheets answer different questions. Signing in: "this is what you chose".
   * Registering: "this is what other people will see you as, for now" - because the
   * display name is derived from this value rather than asked for, and sharing one
   * sentence between the two told a first-time user they could change a display
   * name they had not been given. (The sign-in sheet now says its half of this in
   * `loginDescription` rather than under the field.)
   */
  registerNicknameHint: string;
  loginBtn: string;
  registerBtn: string;

  /**
   * What the sign-in sheet is FOR, plus what the nickname is. It was
   * `enterGroupName` - the first field's own name - which put "Gruppenname" on
   * screen three times in a row: as the sheet's description, as the printed label
   * over the field, and as the placeholder inside it.
   *
   * The nickname sentence lives here rather than under the field because of *when*
   * it is read rather than about the room it took: a dialog description is announced
   * with the title when the sheet opens, and a person asks whether a nickname has to
   * be their real name exactly once, on the way in - where a line printed for the
   * whole interaction answers it again on every later glance. The
   * `aria-describedby` on that field did not go with the sentence; it now names the
   * error the reader earned, because a description that is a constant describes
   * nothing about what was typed.
   */
  loginDescription: string;
  registerDescription: string;

  logout: string;
  changeLanguage: string;

  /** The two halves of the contents page. */
  yourLists: string;
  sharedWithYou: string;
  createList: string;
  createListDescription: string;
  deleteList: string;
  /**
   * The title of the delete-list confirmation, above the sentence that warns about
   * the cascade. It was in all three locale files and in no type while the member
   * equivalent existed - both were reachable only through `dict: any`.
   */
  removeListConfirm: string;
  noLists: string;
  noSharedLists: string;

  features: Features;
  landing: {
    /**
     * The one sentence under the claim on the landing page: what the reader gets,
     * said plainly, rather than a second adjective about the product. Written to
     * hold its own measure at `max-w-[52ch]` and to survive a 390px phone, where
     * the German and the Russian are the longest of the three.
     */
    standfirst: string;
  };
  preview: LandingPreviewTranslations;
  errors: ErrorTranslations;
  success: SuccessTranslations;
  toasts: ToastTranslations;
  confirmations: ConfirmationTranslations;
  visibility: VisibilityTranslations;
  listSheet: ListSheetTranslations;
  shareList: ShareListDictionary;
  groups: GroupsDictionary;
  createListDialog: CreateListDialogDictionary;
  listBoard: ListBoardDictionary;
  transferDialog: TransferDialogDictionary;
  footer: {
    copyright: string;
    privacyPolicy: string;
    termsConditions: string;
    support: string;
  };
  privacy: PrivacyTranslations;
  terms: TermsTranslations;
  giftCount: {
    /** A list with no gift ideas at all - the one that most needs a present. */
    none: string;
    /** Every idea on the list has been bought. */
    zero: string;
    one: string;
    many: string;
  };
  /*
    There is deliberately no index signature here.

    One used to sit at the bottom of this interface, admitting `string` and a
    handful of object shapes for any key at all. It checked every key that is
    named above and waved through every key that is not, which is what let two
    props describing the same visual concept be typed three different ways - two
    of them `any` - and what let a key exist in `de.json` and be missing from
    `ru.json` without anything noticing.

    A string is only in the product once it exists in de, en and ru. Removing the
    escape hatch is what makes that true by construction rather than by review.
  */
}

/**
 * Every refusal the server can hand back, as a key the client turns into a
 * sentence in the user's language.
 *
 * These are grouped because the grouping is the point: a client that receives
 * `cannot_clear_purchase` and one that receives `forbidden` need different words,
 * and the difference between "you may not do that" and "that is not yours to see"
 * is exactly the distinction `PRODUCT.md:89` calls a product concern.
 */
export interface ErrorTranslations {
  loginRequired: string;
  failedToLoad: string;
  /**
   * A wish field arrived over its bound. One sentence per field rather than a shared
   * one, because the bound is not shared: a wish title stops at 120 characters and a
   * link at 2000, and telling somebody their 2000-character link is fine because
   * "characters" is one word would be a lie about the field they are looking at.
   *
   * `{max}` and `{min}` are interpolated by the caller - `lib/gift-text.ts` holds the
   * numbers and the rule, this holds the words.
   */
  titleTooLong: string;
  titleTooShort: string;
  noteTooLong: string;
  urlTooLong: string;
  failedToLoadGifts: string;
  /**
   * A sign-in attempt that was refused, and the reason it is one sentence rather
   * than two.
   *
   * The route answers "no such account" and "wrong password" with the same 401,
   * both statuses and both in constant time, so that the sign-in cannot be used to
   * find out who is registered - see the long comment in
   * `app/api/auth/login/route.ts`. This sentence therefore names both possibilities
   * and chooses neither, which is the only sentence that is true in either case.
   * Printing one of them would confirm, to somebody typing an address that is not
   * theirs, exactly what they guessed.
   */
  loginRejected: string;
  /**
   * The sign-in never left the device, or came back as something other than JSON.
   *
   * Separate from `loginRejected` because it is a different problem with a different
   * answer: retrying works, and no amount of retyping does. It says nothing about
   * whether the account exists, because nothing was ever asked about that.
   */
  loginOffline: string;
  /**
   * The server answered, and the answer was a 5xx.
   *
   * Deliberately says "that did not work" rather than naming a cause: the route's
   * own catch-all logs the real error and returns a fixed message, so a sentence
   * that guessed at it would be inventing information. "Try again later" is the
   * honest instruction, and it is what a person can act on.
   */
  loginServerError: string;
  /**
   * The quiet way out of the sign-in sheet for somebody who has no account.
   *
   * A question and its action in one control, which is why the sentence is short
   * enough to read as a link rather than as a heading.
   *
   * Which failures offer it is a security decision, and it is drawn on the status
   * rather than on the refusal code: `invalid_identifier` is in the closed union too,
   * so a rule phrased over the union would make every refusal added to it inherit
   * this offer. What makes it safe to show is that it skips no refusal which could
   * mean "you may not have an account": it is offered on a 401, both of its causes
   * alike, and on a status this build cannot read, so its presence can say nothing at
   * all about whether the reader is registered. `auth-buttons.tsx` is where the line
   * is drawn.
   */
  createAccountInstead: string;
  passwordMismatch: string;
  registrationFailed: string;

  /** Credential-shaped refusals, shown against the field that caused them. */
  invalidEmail: string;
  duplicateEmail: string;
  weakPassword: string;
  invalidDisplayName: string;
  /**
   * What the sign-in field says when it holds neither a usable nickname nor a
   * usable address. It cannot reuse `invalidEmail`, which tells a person their
   * address is malformed - the wrong sentence entirely when they typed a handle.
   */
  invalidIdentifier: string;
  /**
   * `PATCH /api/lists/{id}` refusals, for a body that named neither field, both
   * fields, or a visibility that is not one of the two.
   *
   * They were bare strings outside the closed union when both review axes found
   * them, which meant `isRefusal` rejected them and no client could ever have a
   * sentence for them. They are in the vocabulary now, which is what §7.1 means by
   * the status mapping living in one place.
   */
  nothingToChange: string;
  ambiguousChange: string;
  invalidVisibility: string;
  /**
   * A transfer named the list it started from as its own destination.
   *
   * The one refusal in this union that describes a client bug rather than a
   * permission: both ids are the caller's own and they are the same one, so nothing
   * is being hidden from anybody and the sentence does not need to hedge about
   * existence. The picker never offers it - the source list is filtered out of the
   * dialog's rows - so reaching this means the request was built wrongly.
   */
  alreadyOnThisList: string;
  /** Nickname refusals, shown against the nickname field. */
  invalidNickname: string;
  duplicateNickname: string;

  /** Sharing refusals, shown inside the share dialog. */
  noSuchAccount: string;
  alreadyShared: string;
  cannotShareWithOwner: string;
  notSharedYet: string;
  /**
   * The picker found nobody for what was typed.
   *
   * A refusal in the closed union rather than an empty list, because an empty list and
   * a query too short to run are different answers and a person needs to know which
   * one they got: "keep typing" is useless advice for somebody who has typed the whole
   * address of somebody who does not exist.
   */
  invalidSearchQuery: string;
  /** Group refusals, shown against the group name field. */
  noSuchGroup: string;
  /**
   * A second group under one owner's name.
   *
   * Its own sentence rather than a reuse of `alreadyShared`, for the same reason
   * `duplicateNickname` is not `duplicateEmail`: it is a different field and the words
   * a person needs for "you already have a group called Family" are not the words for
   * "this list is already shared with them".
   */
  duplicateGroupName: string;
  /**
   * A group's owner tried to put themselves in it.
   *
   * Its own sentence because `forbidden` is a sentence about a list: reusing it here
   * would put "this list does not grant that" into a dialog that is not about a list,
   * which is the exact failure the closed vocabulary exists to make impossible.
   */
  cannotJoinOwnGroup: string;
  /**
   * The lookup is closed to an account with no list of its own.
   *
   * Its own sentence rather than a reuse of `not_found`. `not_found` is "there is
   * nothing here for you" - true of the endpoint, and true of the *list* the caller
   * was looking for, which is what the string was written for. Reached from the
   * lookup it would say the same words about something else: an account with no
   * lists is not being refused a list, it is being told there is nowhere to share
   * from yet. Those need different advice, because one of them is a dead end and
   * the other is a first step.
   */
  searchNeedsList: string;
  cannotClearPurchase: string;
  forbidden: string;
  notFound: string;
}

export interface SuccessTranslations {
  loggedOut: string;
}

/**
 * The one plate the landing page draws: three of the reader's own lists, at three
 * states.
 *
 * It is a flat object, and that is a decision rather than a leftover. It has been a
 * list twice. First three sample lists under one plate title, which made the plate a
 * specimen of the software rather than a page of somebody's. Then one list drawn
 * three times, its open count falling 3 -> 1 -> 0 and its figure becoming a check
 * in the last one. That version was built, rendered, looked at and rejected: three
 * plates carrying the same head, the same list name and the same single row read as
 * repetition rather than as a story, the plate in the hero's right column and the
 * pair below broke one asymmetric spread into three scattered rectangles, and the
 * plate with the check read as a *different* list rather than as a later state of
 * this one. Nothing about the plate was wrong. Three of them were.
 *
 * So the plate went back to a single list — and then to a single row, which was
 * rejected too, and that is why there are three again. One row is a fragment: a
 * name, a rule and a numeral, saying nothing about a product whose whole argument
 * is what happens to a list over time. Three rows say it at a glance, in the app's
 * own vocabulary rather than in a caption, and the arc arrives as three *rows in one
 * plate* instead of as three plates: nobody has bought from the first yet, one is
 * nearly done, and one is finished.
 *
 * What is flat, and must stay flat, is the plate: one of them. The array below is
 * rows *inside* the one plate, not plates beside it. `tests/landing.spec.ts` counts
 * the plates and the rows separately for exactly that reason.
 */
export interface LandingPreviewTranslations {
  /**
   * `count` is how many ideas are still OPEN - the number the row's count words
   * say out loud. `collected` is how many of the same list's ideas are already
   * bought, and exists so the row's progress rule has real fill: with open counts
   * alone the rule could only ever stand at zero, which read as an empty bar
   * rather than as progress.
   *
   * An array because the plate is a specimen of a contents page, and a contents
   * page is a list of things. It holds three rows today, at 3 open, 1 open and none,
   * because that sequence is the plate's whole argument: it shows a list somebody
   * can still be surprised by, one that is nearly done, and one that is finished,
   * where `SheetProgress` replaces the figure with a check. A plate showing only an
   * untouched list, or only a finished one, would be a third rejected shape - the
   * first argued that nobody can be surprised any more, which is not what a
   * wishlist is for.
   *
   * Numbers, not strings, so this costs no copy in any locale.
   */
  items: { name: string; count: number; collected: number }[];
}

/**
 * The two visibility values, and the sentence that explains each.
 *
 * The hints exist because the labels alone do not say what happens. "Private" and
 * "Shared" describe a state; the hint states the consequence, which is the part
 * that matters before anyone presses the control.
 */
export interface VisibilityTranslations {
  private: string;
  shared: string;
  privateHint: string;
  sharedHint: string;
  /** The label on the control that changes it. */
  change: string;
  /** Section heading on a list that is shared with somebody. */
  sharedWith: string;
  /** Section heading on a list that is shared with nobody yet. */
  sharedWithNobody: string;
}

export interface ListSheetTranslations {
  /*
    `listHint` was here and is gone: the owner saw "Auf dieser Liste schreibst nur
    du." between the list's name and the `PRIVAT` chip, which then said "Nur du
    siehst diese Liste." One fact, three sentences, and the one that went was the
    least useful of the three. `youAreABuyer` below stays for the reader who cannot
    see the owner's controls at all.
  */
  /**
   * The first of the three buttons in the action bar at the foot of a sheet
   * that has wishes on it, and the only one of the three that is solid:
   * writing a wish down is the action this surface exists for, while copy
   * and move are things done to wishes that already exist. It opens the
   * add form.
   *
   * Distinct from `addGift` below, which commits the form. They used to be
   * one string (`addGiftRow`, the foot row's own label), which meant the
   * foot row and the submit button said the same words for two different
   * actions.
   */
  newGift: string;
  /**
   * The action-bar verb that puts the sheet into copy mode: the selection
   * boxes appear and the bar becomes the selection bar. A verb, because it
   * names what will happen to the wishes the reader is about to mark.
   */
  copy: string;
  /** The action-bar verb for move mode; see `copy` above. */
  move: string;
  /**
   * Opens the destination picker from the selection bar.
   *
   * Names the next decision rather than the transfer itself: which of the
   * two verbs applies was already decided on the action bar, and the only
   * question the selection bar leaves open is which list the selection
   * goes to.
   */
  chooseTarget: string;
  /** Commits the add-wish form. A verb, because the field above it already named the thing. */
  addGift: string;
  enterGiftTitle: string;
  optional: string;
  enterDescription: string;
  enterUrl: string;
  cancel: string;
  adding: string;
  noGifts: string;
  /**
   * What actually goes in a cell, so a blank one can say it. The only thing the
   * add form insists on is a title, and a person staring at an empty sheet has no
   * way of knowing that - "notiz und link are optional" is the sentence that turns
   * a blank cell from a wall into one field.
   */
  emptyCellHint: string;
  markAsPurchased: string;
  markAsAvailable: string;
  deleteGift: string;
  /** Title of the delete-confirmation dialog; the button reuses deleteGift. */
  deleteGiftConfirm: string;
  /**
   * The two printed labels that head a sheet. A sheet is divided into the cells
   * still waiting and the cells already stamped, because "what is still needed" and
   * "what is already handled" are different questions and a single undifferentiated
   * list cannot answer either.
   */
  openIdeas: string;
  collectedIdeas: string;
  /**
   * Shown to somebody reading a list that is not theirs, above the sheet. It says
   * the one thing they can do that the owner cannot do for them, because otherwise
   * a buyer has to guess whether the controls are missing or broken.
   */
  youAreABuyer: string;
  /**
   * Shown on a mark the reader may not clear - which is the owner's view of a mark
   * somebody else set. It is a refusal stated as a fact rather than as an error,
   * because it is not a failure: the mark is correct and permanent.
   */
  markedBySomeoneElse: string;
  backToLists: string;

  /**
   * The checkbox in the left margin of a cell, for the owner only.
   *
   * A visible label rather than an `aria-label` alone, because it is what the
   * control *is* and a sighted owner has to be able to see that the cell can be
   * picked up at all - a checkbox drawn only for assistive technology is a control
   * the person holding the phone cannot find.
   */
  selectGift: string;
  /**
   * The same checkbox's name for assistive technology, with the wish's
   * own title in it. The bare `selectGift` would name every box on the
   * sheet identically, so a reader working through a transfer mode would
   * hear what the control is and never which wish it belongs to; the
   * title is the fact the cell's text gives a sighted owner.
   */
  selectGiftNamed: string;
  /**
   * What the advertisement mark on a cell says, once, for the tooltip a pointer
   * reads and for the link's name a screen reader announces. One string for both
   * so the two cannot say different things about the same link.
   *
   * It leads with the word that makes it recognisable as advertising and says who
   * earns, and it does not name the shop: the partner agreement limits what may be
   * said publicly about the programme to its own one-line statement, with the
   * marking the law requires as the only exception, and this is that marking. The
   * statement itself is not here.
   */
  affiliateNotice: string;
  /**
   * How many wishes are selected, in four forms.
   *
   * Russian inflects by number and one template cannot express it, so this is a
   * ladder rather than a singular/plural pair - see `selectedCountLabel` in
   * `lib/gift-count.ts` for why the bands are cut where they are. A language that
   * does not need four forms maps three of them onto one string.
   *
   * Deliberately separate from `giftCount` above: a sheet's open count and a
   * selection's size are different facts that are frequently different numbers, and
   * one dict entry for "how many" would have had to say which one it meant.
   */
  selectedCount: {
    one: string;
    two: string;
    few: string;
    many: string;
  };
}

export interface ToastTranslations {
  giftAdded: string;
  giftAddFailed: string;
  giftStatusPurchased: string;
  giftStatusBackToList: string;
  giftStatusUpdateFailed: string;
  giftDeleted: string;
  giftDeleteFailed: string;
  listCreated: string;
  listCreateFailed: string;
  listRenamed: string;
  listRenameFailed: string;
  listDeleted: string;
  listDeleteFailed: string;
  visibilityChanged: string;
  visibilityChangeFailed: string;
  accessGranted: string;
  accessGrantFailed: string;
  accessRevoked: string;
  accessRevokeFailed: string;
  /**
   * Every group sentence carries a `{name}` placeholder for the same reason
   * `accessGranted` does: rendered unsubstituted it would put a literal `{name}` in
   * front of the owner, and because an unsubstituted placeholder is still a valid
   * string, nothing throws and the dictionary has no way to complain.
   */
  groupCreated: string;
  groupCreateFailed: string;
  groupRenamed: string;
  groupRenameFailed: string;
  groupDeleted: string;
  groupDeleteFailed: string;
  groupMemberAdded: string;
  groupMemberAddFailed: string;
  groupMemberRemoved: string;
  groupMemberRemoveFailed: string;
  groupShared: string;
  groupShareFailed: string;
  groupAccessRevoked: string;
  groupAccessRevokeFailed: string;
  loginSuccess: string;
  registrationSuccess: string;
  /**
   * A batch of wishes that arrived on another list.
   *
   * **No `{count}`.** The transfer toasts are the only strings in this interface
   * that carry no number, and that is the point rather than an omission:
   * Russian inflects the noun by number (1 идея, 2 идеи, 5 идей), so a single
   * counted template cannot be written correctly in one of the three shipped
   * languages. The bar above the add row already states the figure in a properly
   * inflected form, so the toast reports the *outcome* and the count sentence
   * reports the size - two jobs, two mechanisms, and no second plural machinery
   * invented here.
   *
   * `giftsMoved` and `giftsCopied` are separate strings rather than one with a
   * parameter, for the same reason: the verb is the whole difference between the
   * two operations and interpolating it into a sentence would need a placeholder
   * that no locale can fill with a correctly inflected pair of words.
   *
   * **Three ways to fail, because the server says which.** `giftsTransferFailed` is
   * the sentence for a request that did not arrive or was not understood - the reader
   * cannot act on it except by pressing again. The other two are for refusals the
   * reader *can* act on: `giftsTransferNotFound` when a wish or the destination has
   * gone since the sheet was loaded (the sheet reloads and the next press is a
   * different request), and `giftsTransferTooMany` when the selection is over the
   * limit. The limit is not in the sentence for the same reason there is no `{count}`
   * - and so that the number can change on the server without three translations
   * going stale.
   */
  giftsCopied: string;
  giftsMoved: string;
  giftsTransferFailed: string;
  giftsTransferNotFound: string;
  giftsTransferTooMany: string;
}

export interface ConfirmationTranslations {
  deleteGift: string;
  /**
   * Names the list, because both callers delete one and both are irreversible.
   * It used to be a fixed sentence about "this list" - and the sheet that
   * confirmation opens over measures 93.2% of a 390x844 viewport, so on the
   * device this product is used on there is no longer a board on screen to work
   * out which list the sentence is about.
   */
  deleteListNamed: string;
  /**
   * Names the group, and states what is lost.
   *
   * A group is the product's second irreversible control and the first sentence this
   * has to carry two clauses. Deleting one is not like withdrawing access from a row:
   * it takes the group out of every list that was shared with it, so anybody who was
   * reaching a list only through this group stops reaching it, and the group cannot be
   * restored. `PRODUCT.md:101` says say what will happen before it happens, and the
   * consequence is the whole content of the prompt.
   */
  deleteGroupNamed: string;
}

export interface CreateListDialogDictionary {
  createListTitle: string;
  enterListName: string;
  create: string;
  creating: string;
  /** The two choices, and the sentence under each. */
  visibilityLegend: string;
  private: string;
  privateHint: string;
  shared: string;
  sharedHint: string;
}

export interface ShareListDictionary {
  shareTitle: string;
  /**
   * The one-sentence explanation of what sharing does. It is the load-bearing
   * string in this dialog: the field below it grants one person the whole list, and
   * nothing else on screen says so.
   *
   * It says a name *or* an address because the field below takes either and searches
   * both. This string was written for a field that took an email address and nothing
   * else, and a sheet that describes itself wrongly is worse than one that describes
   * itself briefly - it is the only sentence on screen telling the owner what the
   * control does.
   */
  shareLead: string;
  /** The picker's field label and placeholder: one field, either kind of answer. */
  enterNameOrEmail: string;
  /** Shown while a lookup is in flight, where the field used to say "adding". */
  searching: string;
  /** A query that ran and matched nobody. */
  noSearchResults: string;
  /** A query too short to run, which is not the same answer as matching nobody. */
  searchHint: string;
  /**
   * The instruction for the result list: pick one, and it is added.
   *
   * Without it the list is a read-only thing on screen, and an owner who typed three
   * characters and got eight rows has been told a question rather than given a
   * control.
   */
  searchPickPrompt: string;
  add: string;
  adding: string;
  revoke: string;
  revokeConfirmTitle: string;
  /** Shown when nobody has been added to a shared list yet. */
  nobodyYet: string;
  /**
   * On a private list, the whole dialog is replaced by this: the list has to be
   * shared before it can be shared with somebody, and saying so is clearer than a
   * disabled field with no explanation.
   */
  privateFirst: string;
  makeShared: string;
  /**
   * The one head over the whole audience - the people and the groups that can
   * already reach this list. It is a question rather than a noun because the
   * audience was two labelled lists ("Geteilt mit:" and "Gruppen") and the same
   * group then appeared a third time in the offer below, saying the opposite
   * thing about itself.
   */
  audienceHeading: string;
  /**
   * The head above the groups this list is *not* on yet. Groups already reaching
   * the list are printed in the audience above, so this list holds every group
   * exactly once and the two sections can never contradict each other.
   */
  groupPickerHeading: string;
  /** The owner has no groups, so there is nothing to offer. Names where to make one. */
  noGroupsToShare: string;
  /** On a group row in the audience: how many people the group reaches. */
  groupReaches: string;
  revokeGroupConfirmTitle: string;
}

/**
 * Managing the groups an account owns.
 *
 * A whole dictionary rather than keys spread across `shareList` and `header`, because
 * groups are the only entity in this product that has a management surface of its own:
 * lists are managed from the contents page and people are managed from the share
 * dialog, but a group is created before there is any list to share it with, so it has
 * to be reachable from somewhere that is not a list.
 */
export interface GroupsDictionary {
  /** The header control's accessible name. */
  openGroups: string;
  title: string;
  lead: string;
  noGroups: string;
  create: string;
  creating: string;
  enterGroupName: string;
  rename: string;
  renameTitle: string;
  renameLabel: string;
  save: string;
  saving: string;
  deleteGroup: string;
  noMembers: string;
  /**
   * The group-member picker reuses the account picker rather than having a second one,
   * so these are its label and its two states inside this dialog.
   */
  addMemberLabel: string;
  removeMember: string;
  removeMemberConfirmTitle: string;
  /** A row's member count, as the owner reads it: "Family · 4 people". */
  memberCount: string;
  /**
   * The foot control that opens the name field. The create form used to sit at the
   * top of this dialog permanently, under a solid ink button, above the reader's
   * own groups - so the loudest object on the screen was "make another one" and
   * the list was pushed down under it. It is at the foot now, quiet, and one tap
   * away, which is the same arrangement the list sheet uses for its own add row.
   */
  newGroup: string;
  /**
   * The way back out of one group, and the answer to a drill-down with no exit.
   * `aria-controls` points at the list this returns to, so the relationship is
   * stated to assistive technology as well as drawn.
   */
  backToGroups: string;
}

export interface ListBoardDictionary {
  /** The two section headings, repeated for the sheet's own back link. */
  yourLists: string;
  sharedWithYou: string;
  createList: string;
  rename: string;
  renameTitle: string;
  renameLabel: string;
  save: string;
  saving: string;
  deleteList: string;
  changeVisibility: string;
  share: string;
  /**
   * The same sentence for a row that a group also reaches. It opens with the
   * preposition alone - "mit: 0 Personen · Gruppen: 1" - because the chip beside
   * it has already printed the state as `Geteilt`, and a string that opened with
   * the same word said it twice in two faces forty pixels apart.
   *
   * A second string rather than one string with an optional half, so the two counts are
   * always printed together and in a fixed order. A locale that wanted a different
   * conjunction or word order gets it here rather than by the component deciding to
   * join two halves with a middle dot.
   *
   * Both halves are abbreviated in Russian ("{count} чел. · {groups} гр."), and that is
   * a deliberate trade rather than sloppiness. Russian inflects the noun by the number:
   * 1 человек, 2 человека, 5 человек. One template string cannot express that, and a
   * group of two to four people is the *common* case for the very groups this feature
   * exists for — "Family" is usually three people — so getting it wrong is not a rare
   * edge, it is the ordinary one. `gift-count.ts` solves this properly for gift counts
   * by deriving four states from the number, and these three strings are what such a
   * mechanism would have to cover to be fixed properly. The abbreviation is correct for
   * every number today and costs no new machinery; the alternative was shipping the
   * wrong word for most groups.
   *
   * German and English take the other number-neutral route, a label before the
   * figure ("Personen: 3", "People: 3"). Both languages inflect too — German
   * "1 Personen" and English "1 people" are both wrong — and a label reads correctly
   * at every number without the abbreviation looking like a typo. That is the whole
   * trade: Russian cannot put the noun *after* the number and stay grammatical
   * without its cases, so it abbreviates; the two that can, label.
   */
  sharedWithGroupCount: string;
  /**
   * The contents page with nothing on it, and the plate it prints. `noLists` is
   * the sentence and it is the control: the empty board's blank plate is a
   * button spanning the full content width, so the invitation and the action are
   * one object - the same arrangement the blank cell of an empty list sheet
   * uses. It names the thing being made rather than counting what is missing,
   * because the section head above it already says whose lists these are.
   */
  noLists: string;
  /**
   * The plate's second line, and the one that earns the plate: what actually goes
   * in. Without it a large dashed rectangle with a sentence in it is a wall, and
   * the reader cannot tell what pressing it will ask of them.
   */
  emptyPlateHint: string;
  private: string;
  shared: string;
  /**
   * The sentence under the "shared with you" head when that section is empty.
   * Reworded to name the moment rather than the absence: it used to say nobody has
   * shared anything with you, which is a fact about the past and gives a reader
   * who has just been given a list the impression that the app has not noticed.
   */
  sharedEmptyNote: string;
}

/**
 * Choosing where a selection of wishes goes.
 *
 * A dictionary of its own rather than more keys on `listSheet`, because it is a
 * separate surface with a separate lifetime: this is a sheet that opens over the
 * sheet and closes again, while the ones it describes are printed on the page
 * underneath. `dict` here is a narrow `Pick` for the same reason
 * `ListVisibilityDialogProps` is - the dialog cannot reach the landing page's copy,
 * so there is nothing to stop it printing the wrong sentence from the wrong object.
 *
 * **One commit, and the verb is already chosen.** The copy-or-move decision
 * was made on the action bar before this dialog ever opened, so the sheet
 * below lists the caller's own lists and exactly one button performs the
 * transfer: the verb the reader already pressed, on the row they have just
 * chosen. Two buttons would put a second decision on screen that the reader
 * has already made, and a pair of commits each disabled until a row is
 * chosen is two inert controls where one says everything. One button names
 * what the press will do, and nothing else on this sheet can start it.
 *
 * `copying` and `moving` are separate strings rather than one label with a
 * parameter, so the button that is pressed is the button that names itself - and so
 * a locale can inflect them differently, which a spliced-in word would not allow.
 */
export interface TransferDialogDictionary {
  /**
   * Names what the reader is doing, and says neither verb on purpose: the
   * verb was chosen on the sheet that opened this one, so the title is the
   * same sentence in both modes. The verb belongs on the one commit button,
   * where it names what the press will do.
   */
  title: string;
  copyHere: string;
  moveHere: string;
  /** The pressed state of each commit, swapped in while its request is in flight. */
  copying: string;
  moving: string;
  /** The prefetch of the caller's own lists failed. Paired with `retry`. */
  error: string;
  retry: string;
}

/*
  There is deliberately no `noLists` on `TransferDialogDictionary`, and that is the
  reuse rather than the omission. The sentence a reader needs when they own no other
  list is the one the contents page already prints to invite exactly that -
  `listBoard.noLists` - and a second key holding the same words in two files is two
  places for the two copies to drift, which is the reason the closed dictionary
  exists. The dialog takes `listBoard` in its `Pick` for exactly this line.

  The empty state and the *failure* state are different sentences on screen at the
  same moment, and neither of them is this one: `error` is for a failed request,
  which says retry, and `noLists` is for an account with genuinely nowhere to put the
  selection, which says make a list. Collapsing them would tell a reader whose
  network failed to go and create a list they already have.
*/

/*
  The privacy policy and the terms are long, sectioned prose that changes only
  when the product's data handling changes - which this refactor does, and
  significantly. They are modelled structurally rather than as numbered keys for
  two reasons: the sections are edited as documents, and a flat list of
  `section1Title`, `section2Title` … makes adding a section in the middle a
  renumbering of everything after it.
*/
export interface DocumentSection {
  title: string;
  content: string;
}

export interface PrivacyTranslations {
  title: string;
  sections: DocumentSection[];
  /**
   * Sub-sections, where a section has them. Empty for the sections that do not.
   * `PRODUCT.md:67` records that the operator details in section 2 are still
   * unfilled placeholders in a publicly deployed app - a known legal gap, kept
   * visible here rather than quietly carried along.
   */
  subsections?: { title: string; content: string }[];
}

export interface TermsTranslations {
  title: string;
  sections: DocumentSection[];
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ListBoardProps {
  lists: ListSummary[];
  shared: ListSummary[];
  dict: Translations;
  onOpenList: (listId: string) => void;
  onCreateList: () => void;
  onShareList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onListChanged: () => void;
}

export interface ListRowProps {
  list: ListSummary;
  dict: Translations;
  onOpen: (listId: string) => void;
  onShare?: (listId: string) => void;
  onRename?: (listId: string) => void;
  onChangeVisibility?: (listId: string) => void;
  onDelete?: (listId: string) => void;
  /**
   * The row whose rename or visibility request is in flight. It dims and refuses
   * re-clicks, so a double submit cannot fire two mutations at one row.
   */
  busyId?: string | null;
}

/**
 * The privacy state, on a chip rather than as a loose word in the caption label.
 *
 * A two-value union rather than a boolean because the two states are named things
 * the owner chose, and a boolean would let a caller render the wrong one without
 * the type noticing. `label` is passed in rather than looked up so the chip carries
 * no dictionary of its own.
 */
export type StatusBadgeVariant = 'private' | 'shared';

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label: string;
}

export interface ListSheetProps {
  list: ListSummary;
  gifts: Gift[];
  access: ListAccess[];
  /**
   * The group grants on this list, which the owner is shown beside `access` and a
   * buyer is not. Two arrays rather than one union because a person who reaches this
   * list through two grants appears once as a person, and folding a group into the
   * person list would either duplicate them or lose the group row that removes nine
   * people at once.
   */
  groupAccess: ListGroupAccess[];
  isOwner: boolean;
  dict: Translations;
  onClose: () => void;
  onGiftAdded: () => void;
  onGiftChanged: () => void;
  onGiftDeleted: () => void;
  onDeleteList: () => void;
  onShareList: () => void;
  onVisibilityChanged: () => void;
  /**
   * A batch of wishes has landed on another list the owner holds.
   *
   * Reports the *destination*, and it is the only prop here that carries an
   * argument, because it is the only one whose consequence is a navigation rather
   * than a refetch. The sheet has performed the transfer; the page owns the route
   * change, the same way it owns the one after a list is deleted - and it does that
   * through `pendingPath`, which is what puts the existing route-change loader up
   * rather than inventing a second one.
   *
   * Called in both modes. Moving leaves this sheet without those wishes and staying
   * on it would show a sheet that looks emptied by a bug; copying leaves everything
   * where it was, and branching the navigation for no visible difference is a branch
   * nobody could justify later.
   */
  onTransferred: (targetListId: string) => void;
}

/**
 * The destination picker for a selection.
 *
 * Reports the list the reader chose and the mode they pressed; it performs nothing
 * itself. That split is what lets the request live in `ListSheet`, which already
 * performs every other gift mutation, and leaves this component a list of rows and
 * one button.
 *
 * `lists` is the caller's own lists with the source already removed, and it arrives
 * as a prop rather than being fetched here: the fetch happens when the transfer
 * mode is entered, which is earlier than this dialog opens, so by the time this is
 * on screen the rows are in hand and the dialog has nothing to wait for.
 */
export interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The caller's own lists, minus the one they are transferring out of. */
  lists: ListSummary[];
  /**
   * Those lists are still on their way.
   *
   * Separate from `lists` being empty, and the distinction is the whole point: the
   * prefetch starts when the transfer mode is entered, but nothing stops a reader
   * opening the picker before it lands, and an empty list read as "you have no other
   * lists" would send them off to create one they already have. Three states, three
   * sentences - loading, none, and the refusal's.
   */
  isLoading: boolean;
  /** The list being transferred out of, named in the dialog's own sentence. */
  sourceListName: string;
  dict: Pick<Translations, 'transferDialog' | 'close' | 'giftCount' | 'listBoard'>;
  /** The prefetch failed. The dialog shows `error` and a retry rather than an empty list. */
  loadFailed: boolean;
  onRetry: () => void;
  /**
   * Which verb this dialog commits, decided on the sheet that opened it.
   *
   * Non-nullable because there is no way to reach this dialog without it: the
   * only trigger is the selection bar, which exists only inside a transfer
   * mode. A `null` case would be a state the type promises but the product
   * cannot produce.
   */
  mode: 'copy' | 'move';
  /**
   * Whether the commit's request is in flight, and the one boolean this
   * dialog needs: with a single commit there is no second button that could
   * be told the wrong progress wording, so the mode alone says *which*
   * transfer is running and this says *that* one is.
   */
  isPending: boolean;
  onTransfer: (targetListId: string, mode: 'copy' | 'move') => void;
}

/**
 * `/{lang}/list/[id]`.
 *
 * Separate from `PageProps` because that one carries only `lang`, and a page whose
 * props type does not mention `id` would resolve to the global `PageProps` Next 16
 * generates into `.next/types/routes.d.ts` - which is parameterised by route. That
 * shadowing is deliberate and is why `PageProps` is declared by hand at all; adding
 * `id` to it would make the dashboard claim a parameter it does not have.
 */
export interface ListPageProps {
  params: Promise<{ lang: string; id: string }>;
}

export interface CreateListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dict: Translations;
  onCreated: (listId: string) => void;
}

/**
 * The board or the sheet, wrapped in the same furniture.
 *
 * Shared by `/[lang]/dashboard` and `/[lang]/list/[id]`, and it is a prop interface
 * here rather than inline at the component for the repo's reason - one type surface,
 * and the second caller's signature visible next to the first's.
 */
export interface SheetFrameProps {
  header: HeaderProps;
  dict: Translations;
  children: ReactNode;
  /**
   * From `sm` up, cap the sheet at a reading width and centre it, instead of
   * letting it fill the page's `max-w-5xl` column. The contents page passes it and
   * the sheet of one list does not: a contents row is a name, a figure and four
   * controls on one line, and those only read as one row when the line is short
   * enough to take in at once. Below `sm` it changes nothing.
   */
  narrow?: boolean;
}

/**
 * The two-state chooser for a list's reach.
 *
 * Reports a *choice*, never a mutation: the contents page dims its row while the
 * PATCH is in flight and the sheet reports afterwards, so this dialog decides what a
 * reader is choosing between and nothing about what happens next - it closes, and
 * the caller decides when the world changes.
 */
export interface ListVisibilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: ListVisibility;
  /** The two states, both labels and both hints, plus the dialog's close label. */
  dict: Pick<Translations, 'visibility' | 'close'>;
  onSelect: (visibility: ListVisibility) => void;
  isPending?: boolean;
}

export interface ShareListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  visibility: ListVisibility;
  access: ListAccess[];
  groupAccess: ListGroupAccess[];
  dict: Translations;
  onChanged: () => void;
  /** Called after the list is switched to shared from inside the dialog. */
  onVisibilityChanged: () => void;
}

/**
 * Naming somebody, by nickname or by address.
 *
 * Extracted from `share-list-dialog.tsx` into its own module because it is a
 * self-contained control with its own request lifecycle - a debounced lookup, a
 * result list, a selection and then a grant - and leaving it inline would have put
 * three concerns and two unrelated waits in one file that is already the largest in
 * the repo.
 *
 * Two shapes, and the union rather than two optional callbacks because a caller who
 * supplied neither would only find out on the first click: `listId` decides which
 * callback exists, and `?: never` on the other makes the compiler say so at the call
 * site. That is what stops the group manager, which has no list to grant to, from
 * having to pass a dead `onGranted` to satisfy a type.
 *
 * The null case is not a second kind of picker. It is the same control with the last
 * step left off, and it exists because the group manager must ask "which account?"
 * and then make its own request - `POST /api/groups/{id}/members`, which is addressed
 * by account id because adding to a group is not adding to a list. Folding that into
 * the picker would have put a group's membership inside a component whose name is
 * about a list's audience.
 */
export type AccountPickerProps = {
  dict: Translations;
  /** Account ids to hide from the results - the audience, or the current members. */
  alreadyShared: string[];
  /** The picker is unusable without a `SHARED` list; the sheet replaces it instead. */
  isVisible: boolean;
} & (
    | {
        /** The list to grant access to. */
        listId: string;
        /** Called after a successful grant to `listId`. */
        onGranted: () => void;
        onPicked?: never;
      }
    | {
        /** `null` for a search that grants nothing and only reports a choice. */
        listId: null;
        /** Called with the chosen account. No request is made by the picker. */
        onPicked: (account: AccountSearchResult) => void;
        onGranted?: never;
      }
  );

/**
 * Who may reach one list: the people, then the groups.
 *
 * `access` and `groupAccess` stay two arrays and two callbacks rather than one list of
 * a union. A group row is a control that withdraws reach from several people at once
 * and saying so is the point of it, so it cannot be rendered as a row that looks like
 * a person and removes one.
 */
export interface AudienceListProps {
  access: ListAccess[];
  groupAccess: ListGroupAccess[];
  dict: Translations;
  onRevoke: (row: ListAccess) => void;
  onRevokeGroup: (row: ListGroupAccess) => void;
}

/**
 * The header's control that opens the group manager.
 *
 * Nothing outside `components/` reads these; `header.tsx` owns the open state and
 * renders `GroupsDialog` itself. The gate that matters is not the prop shape but
 * where the control is drawn: `header.tsx` shows it only when the session says the
 * account is signed in, so there is no route to a dialog whose every request would be
 * answered 401.
 */
export interface GroupsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dict: Translations;
  /** Called after any create, rename, delete or membership change. */
  onChanged: () => void;
}

/**
 * A list row's gift counts: what is left to buy, and what the list holds.
 *
 * Keeps its old name deliberately. It describes a sheet of ideas, and both a
 * member's sheet and a list's sheet were the same thing; renaming it would have
 * been churn and would have hidden that nothing about the count changed.
 */
export interface MemberGiftCounts {
  unbought: number;
  total: number;
}

export interface AuthButtonsProps {
  dict: Translations;
}

/**
 * The one plate of the landing page: the reader's own contents page.
 *
 * The whole `preview` dictionary, rather than one part of it. While the page drew
 * three states this took a single one of them, because choosing which a plate
 * showed was the page's business - the hero owned the first and the pair below
 * owned the rest. That split was the storyboard's shape, not the plate's, and it is
 * gone; a component handed the dictionary renders all of it and needs to know
 * nothing about how the page is laid out.
 *
 * `testId` is unnumbered: the numbers were only ever there because there was more
 * than one plate. The plate prints no caption of its own, so there is nothing else
 * here to address.
 */
export interface LandingPreviewProps {
  preview: LandingPreviewTranslations;
  /**
   * The contents page's own section head, which the specimen prints as a label and
   * not as a heading - this page has no section for a head to open.
   */
  yourLists: string;
  giftCount: Translations['giftCount'];
  testId: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  /**
   * The machine-readable half of a refusal, when the route answers with one.
   *
   * Deliberately `string` and not the `Refusal` union from `lib/refusals.ts`: this is
   * the one type in the file that crosses the server boundary, so it cannot narrow
   * for the reader. The client narrows it with `isRefusal`, which is a comparison
   * against literals and therefore cannot be walked into `Object.prototype` by a
   * crafted body. Typing it as the union here would claim a guarantee the wire does
   * not make, since `code` is attacker-reachable JSON.
   */
  code?: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  email?: string;
  displayName?: string;
  message?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface RootLayoutProps {
  children: ReactNode;
  /*
    The locale segment, because the root layout lives at `app/[lang]/layout.tsx`
    rather than at `app/layout.tsx`. `<html lang>` is a property of the document
    and the document is the one thing that has to know which of the three
    locales it is carrying.
  */
  params: Promise<{ lang: string }>;
}

export interface HeaderProps {
  /**
   * The signed-in person's display name, shown in place of the wordmark
   * (`PRODUCT.md:72`). Absent when nobody is signed in.
   */
  displayName?: string;
  /*
    The whole dictionary rather than a `Pick` of the two keys the bar used to need.

    The bar needed two keys because it only had a logout control and a language
    switcher, and naming exactly those was the honest type. It now also opens the
    group manager, which needs `groups.openGroups` and `groups.title` and hands the
    whole `Translations` to `GroupsDialog`. `Pick` was the wrong shape rather than
    merely the narrow one: the bar renders a *dialog* that is written against the
    full dictionary, and the alternative - `Pick` plus `Pick` plus the four keys -
    would describe a bar that reads less of the dictionary than it does, and would
    break again the next time that dialog grows a string.
  */
  dict?: Translations;
  onLogout?: () => void;
  showAuth?: boolean;
}

// Deliberately shadows the global PageProps that Next 16 generates into
// .next/types/routes.d.ts: a page that omits `import type { PageProps }` will
// resolve to that generated global instead, which is parameterised by route.
export interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * One claim set as one line of an index. There is no register to choose: the
 * claims are entries of equal weight, and a lead set above them would read as a
 * headline of its own rather than as one of three.
 */
export interface FeatureCardProps {
  title: string;
  description: string;
}

export interface FooterProps {
  dict: Translations;
}

export interface AuthDialogProps {
  children: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  closeLabel: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  displayName: string | undefined;
}

export type LanguageCode = 'de' | 'en' | 'ru';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export type Languages = {
  [key in LanguageCode]: {
    code: LanguageCode;
    name: string;
    flag: string;
  };
};

export interface LanguageFlagProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export interface LanguageSwitcherProps {
  /**
   * The localised name for the control's action ("Change language"). The current
   * language is appended to it by the switcher, because a trigger labelled only
   * with the language it is showing is ambiguous: it reads equally as the current
   * state and as the thing you press to change it.
   */
  label?: string;
}

export interface LoginFormProps {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /**
   * The single sign-in field: a nickname or an email address.
   *
   * Named for what it accepts rather than for one of the two. `email` would be a
   * lie for half the people who use it, and the label and the id are the two places
   * that lie is most expensive.
   */
  identifierError?: string | null;
  passwordError?: string | null;
  /**
   * Opens the registration sheet, offered next to a refused sign-in as the way out
   * for somebody who has no account.
   *
   * Optional, and its *absence* is what hides the control: the caller hands over a
   * handler only in the failures where "you may not have an account yet" is a
   * useful thing to say, and hands over nothing in the ones where it would not be -
   * a server that is broken or a request that never left is not improved by an offer
   * to register. Comparing the rendered sentence against `passwordError` to work
   * that out would be a comparison of two localized strings, which is a test of the
   * translator rather than of the state.
   */
  onCreateAccount?: () => void;
}

export interface RegisterFormProps {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  emailError?: string | null;
  passwordError?: string | null;
  nicknameError?: string | null;
  /**
   * `weak_password` and a confirmation mismatch share the password slot, because
   * they are both about the password and a person fixing one has not been asked to
   * look somewhere else.
   */
  confirmPasswordError?: string | null;
  onEmailChange?: () => void;
  onPasswordChange?: () => void;
  onConfirmPasswordChange?: () => void;
  onNicknameChange?: () => void;
}

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  displayName?: string;
}

export interface GiftCardProps {
  gift: Gift;
  dict: Pick<
    ListSheetTranslations,
    | 'markAsPurchased'
    | 'markAsAvailable'
    | 'deleteGift'
    | 'selectGift'
    | 'selectGiftNamed'
    | 'affiliateNotice'
  >;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  /**
   * Marks or unmarks this wish as part of a batch, from the checkbox or from a long
   * press. Same shape as `onDelete` - an id, no arguments about which direction -
   * because the component holds the selection state it was given and has nothing to
   * decide.
   *
   * Not offered to a buyer, and absent rather than inert for the reason `canDelete`
   * is: see `canSelect`.
   */
  onToggleSelected: (id: string) => void;
  /** Whether this wish is in the current batch. Draws an outline, nothing else. */
  isSelected: boolean;
  /** The row whose transfer is in flight; it dims and the cell goes inert. */
  transferringIds: string[];
  /**
   * Whether this reader may put wishes into a batch - owner only, and
   * only while the sheet is in a transfer mode. Absent for a buyer for
   * the same reason the delete button is, and absent for an owner who is
   * not transferring, because a column of boxes with nothing to do with
   * them is an invitation to a request the server has not been asked for.
   *
   * Distinct from `canDelete` rather than reused from it, because the two are
   * different capabilities that happen to have the same answer today: deleting a
   * wish is one wish at a time and this is a batch, and a future change to either
   * rule would otherwise silently move the other's control with it.
   */
  canSelect: boolean;
  /** The row whose toggle request is in flight; it dims and refuses re-clicks. */
  togglingId: string | null;
  /**
   * The row that actually changed in this sheet session. The cancellation and the
   * settle are gated on it, so opening the sheet with five collected ideas does not
   * replay five cancellations.
   */
  changedId: string | null;
  /**
   * Whether this reader may delete an idea. False on a list shared with somebody
   * else, where the add form is absent too - the whole owner-only surface is gone
   * rather than disabled, because a disabled control is an invitation to ask why.
   */
  canDelete: boolean;
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
}

export interface DebounceOptions {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}