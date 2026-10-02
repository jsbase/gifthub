'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AuthDialog from '@/components/auth-dialog';
import LoginForm from '@/components/login-form';
import RegisterForm from '@/components/register-form';
import { login, register } from '@/lib/auth';
import { acceptedDisplayName, isPasswordLongEnough } from '@/lib/account-name';
import { acceptedEmail } from '@/lib/email';
import { getLocaleFromPath } from '@/lib/i18n-config';
import { isRefusal } from '@/lib/refusals';
import { cn } from '@/lib/utils';
import type { AuthButtonsProps, AuthResponse } from '@/types';

/**
 * The four credential refusals registration can produce, and nothing else.
 *
 * Written out as literals rather than taken as the whole `Refusal` union because
 * the union is the whole API: eight of its twelve members are share and
 * authorization refusals that registration cannot produce and that have no
 * sentence in a registration form. Narrowing the vocabulary here is what lets the
 * table below be a total `Record` - so a refusal added to the API and to this list
 * is a compile error until it has a sentence, instead of a field that quietly says
 * nothing.
 */
const CREDENTIAL_REFUSALS = [
  'invalid_email',
  'duplicate_email',
  'weak_password',
  'invalid_display_name',
] as const;

type CredentialRefusal = (typeof CREDENTIAL_REFUSALS)[number];

/*
  `isRefusal` first, then a membership test, rather than a lookup keyed by whatever
  the body carried. `code` is attacker-reachable JSON, and the order matters: the
  first call rejects anything outside the closed union (including
  `Object.prototype.constructor`, which a `Record` keyed by it would find), the
  second rejects the refusals that exist but are not about a field here.
*/
const isCredentialRefusal = (code: unknown): code is CredentialRefusal =>
  isRefusal(code) &&
  (CREDENTIAL_REFUSALS as readonly string[]).includes(code);

const AuthButtons: React.FC<AuthButtonsProps> = ({ dict }) => {
  const router = useRouter();
  const pathname = usePathname();
  /*
    The locale off the path rather than off the `NEXT_LOCALE` cookie. The switcher
    writes the cookie and then navigates to `/{lang}`, so the path is the later of
    the two and is what the destination page will render in - and it ends the
    `'en'` literal this used to fall back to, which is wrong twice over in an app
    whose default locale is `de` and whose reader may be Russian.
  */
  const locale = getLocaleFromPath(pathname);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /*
    One error per field, held here rather than in the forms, because the forms hold
    no values and are handed nothing but a sentence. Three slots rather than one
    generic one is the point: a refusal the reader can act on has to say which field
    to fix, and "that address is already taken" against the address is a different
    piece of information from the same words under the display name.

    The state outlives the sheet - the forms unmount when their dialog closes, this
    component does not - so the `onOpenChange` handlers clear on the way out.
    Otherwise an Esc close leaves the verdict standing and the next open puts it
    back on an empty field, as an `aria-invalid` nobody earned.
  */
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const clearErrors = useCallback(() => {
    setEmailError(null);
    setPasswordError(null);
    setDisplayNameError(null);
  }, []);

  const goToDashboard = useCallback(() => {
    router.refresh();
    router.push(`/${locale}/dashboard`);
  }, [locale, router]);

  const handleLoginBase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
    clearErrors();

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    /*
      One client-side gate before the request, and it is the address only.

      `acceptedEmail` is the same function the login route runs, so this cannot
      drift from what the server would have said - but it lets the reader be told
      "that is not an address" against the address field in their own language,
      which `login()` in `lib/auth.ts` cannot do: it throws on any non-2xx and
      throws the response body away, so every credential refusal the server has
      arrives here as one indistinguishable `Error`.

      That discarding is also why the *password* gets no equivalent check. There is
      no honest field-level sentence for a refused sign-in: the route answers the
      same 401 for an unknown address as for a wrong password, and printing
      "wrong password" under the password field would confirm which of the two a
      stranger got wrong. So the sheet says the one thing it can - `loginFailed`,
      under the password, meaning "these two values did not sign you in" - and no
      address sentence, which would have implied the address was good.
    */
    if (acceptedEmail(email) === undefined) {
      setEmailError(dict.errors.invalidEmail);
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success(dict.toasts.loginSuccess);
      setIsLoginOpen(false);
      goToDashboard();
    } catch {
      setPasswordError(dict.errors.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
    clearErrors();

    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    /*
      The three rules the server is about to run, run here first - and run from
      the same functions, for the same reason `lib/account-name.ts` is a module
      rather than a copy on each side: one rule, two callers. In the order the
      fields are printed, so a reader who filled the sheet top to bottom is told
      about the topmost thing they still have to fix rather than one further down.

      The mismatch check is the odd one out and has no server counterpart: the
      second password is never sent, so this is the only place the two can be
      compared.

      The two address refusals are the reason the table below exists. "That is not
      an address" and "that address is already taken" are different sentences about
      different problems, and a client that could not tell them apart answered
      "that is not an address" to a reader whose address was fine and simply taken
      - which sends them off to retype something that was never wrong, and reads as
      though the address itself were the problem.
    */
    if (acceptedDisplayName(displayName) === undefined) {
      setDisplayNameError(dict.errors.invalidDisplayName);
      return;
    }
    if (acceptedEmail(email) === undefined) {
      setEmailError(dict.errors.invalidEmail);
      return;
    }
    if (!isPasswordLongEnough(password)) {
      setPasswordError(dict.errors.weakPassword);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError(dict.errors.passwordMismatch);
      return;
    }

    setIsLoading(true);
    try {
      const result = (await register(email, password, displayName)) as
        AuthResponse & { code?: unknown };

      /*
        `AuthResponse` declares `success`, `message` and `error` and no `code`,
        while the register route sends one and `lib/refusals.ts` exists precisely so
        the client can narrow it. The body is read through a local widening rather
        than left unreadable: `isRefusal` still decides what the string may be, so a
        code this build has never heard of falls through to the generic toast
        instead of rendering `undefined` into a field. `code?: string` on
        `AuthResponse` would delete this cast and nothing else.
      */
      const refusal = isCredentialRefusal(result?.code)
        ? result.code
        : undefined;

      if (refusal) {
        const fieldFor: Record<
          CredentialRefusal,
          'email' | 'password' | 'displayName'
        > = {
          invalid_email: 'email',
          duplicate_email: 'email',
          weak_password: 'password',
          invalid_display_name: 'displayName',
        };
        const setters = {
          email: setEmailError,
          password: setPasswordError,
          displayName: setDisplayNameError,
        };
        const sentences: Record<CredentialRefusal, string> = {
          invalid_email: dict.errors.invalidEmail,
          duplicate_email: dict.errors.duplicateEmail,
          weak_password: dict.errors.weakPassword,
          invalid_display_name: dict.errors.invalidDisplayName,
        };
        setters[fieldFor[refusal]](sentences[refusal]);
        return;
      }

      if (!result?.success) {
        toast.error(dict.errors.registrationFailed);
        return;
      }

      toast.success(dict.toasts.registrationSuccess);
      setIsRegisterOpen(false);
      /*
        Registration signs the person in. The route sets the same `auth-token`
        cookie `login` does, so going to the sign-in sheet instead - which is what
        this used to do, because the group route set no cookie at all - would be
        asking a reader to authenticate with the password they just chose.
      */
      goToDashboard();
    } catch {
      toast.error(dict.errors.registrationFailed);
    } finally {
      setIsLoading(false);
    }
  };

  /*
    These two are not debounced, and the reason is that they cannot be. A form
    submit handler has to call `preventDefault()` and read `FormData` off
    `e.currentTarget`, both of which are only valid while React is dispatching
    the event. Wrapping either in `useDebounce` hands the callback a synthetic
    event whose target has already been recycled by the time it runs - which is
    why this used to appear to work: the leading branch returned before the timer
    was armed, so the callback always ran synchronously and no trailing call
    existed to fail. The window did nothing except hide that.

    The double-submit guard these actually need is the `isLoading` check at the
    top of each handler, and the sheet that renders it.
  */

  const handleLoginOpenChange = useCallback(
    (open: boolean) => {
      setIsLoginOpen(open);
      if (!open) clearErrors();
    },
    [clearErrors]
  );

  const handleRegisterOpenChange = useCallback(
    (open: boolean) => {
      setIsRegisterOpen(open);
      if (!open) clearErrors();
    },
    [clearErrors]
  );

  return (
    <div className={cn('flex', 'flex-col', 'gap-3', 'sm:flex-row', 'sm:gap-4')}>
      <Dialog open={isLoginOpen} onOpenChange={handleLoginOpenChange}>
        <DialogTrigger asChild>
          {/*
            No `aria-label`. The button is named by its own visible text, which is
            the dictionary's and is therefore in the reader's language; the English
            `aria-label` this replaces overrode that with a test-id-shaped string
            that did not contain the words on the button, which is what WCAG 2.5.3
            asks for - the accessible name of a control has to carry its visible
            label. `data-testid` is the selector the specs use and is unchanged.
          */}
          <Button
            size='lg'
            className='w-full sm:w-auto sm:min-w-44'
            data-testid='OpenLogin'
          >
            {dict.login}
          </Button>
        </DialogTrigger>
        {/*
          No height class of any kind. The primitive already sizes the sheet to
          its own contents under `xs` (`xs:h-auto` with a max-height cap), so a
          caller that asks for a height here is asking a question the sheet has
          already answered. These two classes were the last survivors of a bug
          where the primitive anchored both vertical edges and `height: auto`
          could not bind; the over-constraint outlived the fix, and on a 390x844
          phone it pinned the sheet at 717px with 389px of empty label stock
          under a 209px form.
        */}
        <AuthDialog
          title={dict.login}
          description={dict.loginDescription}
          closeLabel={dict.close}
        >
          <LoginForm
            dict={dict}
            isLoading={isLoading}
            onSubmit={handleLoginBase}
            emailError={emailError}
            passwordError={passwordError}
          />
        </AuthDialog>
      </Dialog>

      <Dialog open={isRegisterOpen} onOpenChange={handleRegisterOpenChange}>
        <DialogTrigger asChild>
          <Button
            size='lg'
            variant='outline'
            className='w-full sm:w-auto sm:min-w-44'
            data-testid='OpenRegister'
          >
            {dict.register}
          </Button>
        </DialogTrigger>
        {/*
          Four fields and a paragraph: below `sm` the largest form in the app, and
          the only one a reader meets before they have an account. The primitive
          makes the sheet the whole page under the header at that width and lets
          it scroll, so nothing here has to be squeezed to fit - the one thing
          that sets the height is `registerDescription`, at 104 characters in
          German the longest string any dialog in this app opens with, and it gets
          the description's measure rather than a truncated field.
        */}
        <AuthDialog
          title={dict.register}
          description={dict.registerDescription}
          closeLabel={dict.close}
        >
          <RegisterForm
            dict={dict}
            isLoading={isLoading}
            onSubmit={handleRegisterBase}
            emailError={emailError}
            passwordError={passwordError}
            displayNameError={displayNameError}
            onEmailChange={() => setEmailError(null)}
            onPasswordChange={() => setPasswordError(null)}
            onDisplayNameChange={() => setDisplayNameError(null)}
          />
        </AuthDialog>
      </Dialog>
    </div>
  );
};

export default AuthButtons;