import Web3Status from 'components/Web3Status'
import { useIsNftPage } from 'hooks/useIsNftPage'
import { Box } from 'nft/components/Box'
import { Row } from 'nft/components/Flex'
import { HumanProtocolIcon } from 'nft/components/icons'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components/macro'

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

const Navbar = () => {
  const navigate = useNavigate()
  const isNftPage = useIsNftPage()
  const { darkMode } = useTheme()

  return (
    <>
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
