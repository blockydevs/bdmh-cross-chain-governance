import Web3Status from 'components/Web3Status'
import { useIsNftPage } from 'hooks/useIsNftPage'
import { Box } from 'nft/components/Box'
import { Row } from 'nft/components/Flex'
import { HumanProtocolIcon } from 'nft/components/icons'
import { useProfilePageState } from 'nft/hooks'
import { ProfilePageStateType } from 'nft/types'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components/macro'

import { Bag } from './Bag'
import Blur from './Blur'
import { ChainSelector } from './ChainSelector'
import * as styles from './style.css'

const Nav = styled.nav`
  padding: 12px 60px;
  width: 100%;
  height: ${({ theme }) => theme.navHeight}px;
  z-index: 2;

  @media only screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    padding: 12px 8px 12px 16px;
  }
`

const Navbar = ({ blur }: { blur: boolean }) => {
  const navigate = useNavigate()
  const isNftPage = useIsNftPage()
  const { darkMode } = useTheme()
  const sellPageState = useProfilePageState((state) => state.state)

  return (
    <>
      {blur && <Blur />}
      <Nav>
        <Box display="flex" height="full" flexWrap="nowrap">
          <Box className={styles.leftSideContainer}>
            <Box className={styles.logoContainer}>
              <HumanProtocolIcon fill={darkMode ? 'white' : '#6309FF'} onClick={() => navigate('/')} />
            </Box>
            {!isNftPage && (
              <Box display={{ sm: 'flex', lg: 'none' }}>
                <ChainSelector leftAlign={true} />
              </Box>
            )}
          </Box>
          <Box className={styles.rightSideContainer}>
            <Row gap="12">
              {isNftPage && sellPageState !== ProfilePageStateType.LISTING && <Bag />}
              {!isNftPage && (
                <Box display={{ sm: 'none', lg: 'flex' }}>
                  <ChainSelector />
                </Box>
              )}
              <Web3Status />
            </Row>
          </Box>
        </Box>
      </Nav>
    </>
  )
}

export default Navbar
