import { Trans } from '@lingui/macro'
import { GitVersionRow } from 'components/AccountDrawer/GitVersionRow'
import { SlideOutMenu } from 'components/AccountDrawer/SlideOutMenu'
import { LOCALE_LABEL, SUPPORTED_LOCALES, SupportedLocale } from 'constants/locales'
import { useActiveLocale } from 'hooks/useActiveLocale'
import { useLocationLinkProps } from 'hooks/useLocationLinkProps'
import { Checkbox } from 'nft/components/layout/Checkbox'
import { useReducer } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components/macro'
import { ClickableStyle, ThemedText } from 'theme'

const InternalLinkMenuItem = styled(Link)`
  ${ClickableStyle}
  flex: 1;
  color: ${({ theme }) => theme.textTertiary};
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 9px;
  text-decoration: none;
  color: ${({ theme }) => theme.textPrimary};
  gap: 9px;
`

const LanguageItem = styled.div`
  display: flex;
`

function LanguageMenuItem({ locale, isActive }: { locale: SupportedLocale; isActive: boolean }) {
  const { to, onClick } = useLocationLinkProps(locale)
  const [hovered, toggleHovered] = useReducer((s) => !s, false)

  if (!to) return null

  return (
    <InternalLinkMenuItem onClick={onClick} to={to} onMouseEnter={toggleHovered} onMouseLeave={toggleHovered}>
      <Checkbox hovered={hovered} checked={isActive}>
        <span />
      </Checkbox>
      <ThemedText.BodySmall data-testid="wallet-language-item">{LOCALE_LABEL[locale]}</ThemedText.BodySmall>
    </InternalLinkMenuItem>
  )
}

const SectionTitle = styled(ThemedText.SubHeader)`
  color: ${({ theme }) => theme.textTertiary};
  padding: 16px 0;
  font-size: 14px;
  font-weight: 600;
`

export default function SettingsMenu({ onClose }: { onClose: () => void }) {
  const activeLocale = useActiveLocale()

  return (
    <SlideOutMenu title={<Trans>Settings</Trans>} onClose={onClose}>
      <SectionTitle data-testid="wallet-header">
        <Trans>Language</Trans>
      </SectionTitle>
      {SUPPORTED_LOCALES.map((locale, index) => (
        <LanguageItem key={index}>
          <LanguageMenuItem locale={locale} isActive={activeLocale === locale} key={locale} />
        </LanguageItem>
      ))}
      <GitVersionRow />
    </SlideOutMenu>
  )
}
