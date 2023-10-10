import styled from 'styled-components/macro'
import { ThemedText } from 'theme'

const BannerWrapper = styled.div`
  width: 100%;
  height: ${({ theme }) => theme.navHeight}px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 60px;
  z-index: 2;
  background-color: yellow;
`

const Banner = () => {
  return (
    <BannerWrapper>
      <ThemedText.BodyPrimary>This is a testing version</ThemedText.BodyPrimary>
    </BannerWrapper>
  )
}

export default Banner
